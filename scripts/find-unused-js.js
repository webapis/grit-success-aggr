#!/usr/bin/env node
/**
 * Find and optionally delete unused JS/TS files.
 *
 * Usage:
 *   node find-unused-js.js --list
 *   node find-unused-js.js                  # Preview unused files (safe)
 *   node find-unused-js.js --delete         # Delete with confirmation
 *   node find-unused-js.js --delete --yes   # Delete without asking
 *   node find-unused-js.js --json           # Save unused file list to JSON
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();

const args = process.argv.slice(2);
const modeList = args.includes("--list");
const modeDelete = args.includes("--delete");
const modeYes = args.includes("--yes");
const modeJson = args.includes("--json");

function color(text, code) {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const green = (t) => color(t, "32");
const yellow = (t) => color(t, "33");
const red = (t) => color(t, "31");

async function readJson(p) {
  try {
    const txt = await fs.readFile(p, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let items;
    try {
      items = await fs.readdir(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const it of items) {
      if (it.name === "node_modules" || it.name.startsWith(".")) continue;
      const full = path.join(d, it.name);
      if (it.isDirectory()) {
        stack.push(full);
      } else if (it.isFile() && /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(it.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function parseImports(content, importer) {
  const sources = new Set();
  const patterns = [
    /import\s+[^;]*?from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) sources.add(m[1]);
  }

  // Detect path.join(__dirname, 'file.js') patterns and __dirname + '/file.js' concatenations
  try {
    const pjRe = /path\.join\(\s*__dirname\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    let m2;
    while ((m2 = pjRe.exec(content))) {
      const part = m2[1];
      // convert to relative spec relative to importer
      const rel = part.startsWith('.') ? part : `./${part}`;
      sources.add(rel);
    }

    const plusRe = /__dirname\s*\+\s*['"]\/?([^'"]+)['"]/g;
    while ((m2 = plusRe.exec(content))) {
      const part = m2[1];
      const rel = part.startsWith('.') ? part : `./${part}`;
      sources.add(rel);
    }
  } catch (e) {
    // ignore parsing errors
  }

  // If importer provided, return array of specs. Some specs may be relative like './file.js'
  return Array.from(sources);
}

async function resolveImport(importer, spec) {
  // Resolve relative or absolute imports first
  if (spec.startsWith(".") || spec.startsWith("/")) {
    const importerDir = path.dirname(importer);
    const base = path.resolve(importerDir, spec);
    const candidates = [
      base,
      base + ".js",
      base + ".ts",
      base + ".mjs",
      base + ".cjs",
      base + ".jsx",
      base + ".tsx",
      path.join(base, "index.js"),
      path.join(base, "index.ts"),
    ];
    for (const c of candidates) {
      try {
        const st = await fs.stat(c);
        if (st.isFile()) return path.normalize(c);
      } catch {}
    }
    return null;
  }

  // Handle bare imports that point to workspace top-level folders like 'src/...'
  // Treat them as project-root relative when the first path segment matches a known folder.
  const first = spec.split('/')[0];
  const knownTop = new Set([
    'src',
    'scripts',
    'config',
    'test',
    'questions',
    'storage',
  ]);
  if (knownTop.has(first)) {
    const base = path.resolve(root, spec);
    const candidates = [
      base,
      base + ".js",
      base + ".ts",
      base + ".mjs",
      base + ".cjs",
      base + ".jsx",
      base + ".tsx",
      path.join(base, "index.js"),
      path.join(base, "index.ts"),
    ];
    for (const c of candidates) {
      try {
        const st = await fs.stat(c);
        if (st.isFile()) return path.normalize(c);
      } catch {}
    }
  }

  // Otherwise we don't resolve package or external imports here
  return null;
}

async function buildGraph(files) {
  const graph = new Map();
  for (const f of files) {
    let content = "";
    try {
      content = await fs.readFile(f, "utf8");
    } catch {}
  const specs = parseImports(content, f);
    const deps = new Set();
    for (const s of specs) {
      const resolved = await resolveImport(f, s);
      if (resolved) deps.add(path.normalize(resolved));
    }
    graph.set(path.normalize(f), deps);
  }
  return graph;
}

async function getRoots(pkgJson, allFiles) {
  const roots = new Set();
  if (pkgJson?.main) {
    const p = path.resolve(root, pkgJson.main);
    try {
      const st = await fs.stat(p);
      if (st.isFile()) roots.add(path.normalize(p));
    } catch {}
  }
  if (pkgJson?.scripts) {
    for (const val of Object.values(pkgJson.scripts)) {
      const re = /node\s+([^\s&|]+)/g;
      let m;
      while ((m = re.exec(val))) {
        let candidate = m[1].replace(/^['"]|['"]$/g, "");
        const resolved = path.resolve(root, candidate);
        try {
          const st = await fs.stat(resolved);
          if (st.isFile()) roots.add(path.normalize(resolved));
        } catch {}
      }
    }
  }
  for (const f of allFiles) {
    const rel = path.relative(root, f).replace(/\\/g, "/");
    if (rel.startsWith("scripts/")) roots.add(path.normalize(f));
  }
  return roots;
}

function traverse(graph, roots) {
  const visited = new Set();
  const stack = Array.from(roots);
  while (stack.length) {
    const cur = stack.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const deps = graph.get(cur);
    if (!deps) continue;
    for (const d of deps) if (!visited.has(d)) stack.push(d);
  }
  return visited;
}

async function confirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

(async function main() {
  const pkg = (await readJson(path.join(root, "package.json"))) || {};
  const allFiles = (await walk(root)).map((p) => path.normalize(p));
  const graph = await buildGraph(allFiles);
  const roots = await getRoots(pkg, allFiles);
  const used = traverse(graph, roots);
  for (const deps of graph.values()) for (const d of deps) used.add(d);

  const unused = allFiles.filter((f) => !used.has(f) && !f.includes("find-unused-js"));
  unused.sort();

  if (modeList) {
    console.log(green("All JS/TS files:"), allFiles.length);
    console.log(yellow("Used files:"), used.size);
    console.log(red("Unused files:"), unused.length);
    process.exit(0);
  }

  // ✅ New JSON mode
  if (modeJson) {
    const outputPath = path.join(root, "unused-files.json");
    const jsonData = {
      timestamp: new Date().toISOString(),
      total: unused.length,
      unused: unused.map((f) => path.relative(root, f).replace(/\\/g, "/")),
    };
    await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), "utf8");
    console.log(green(`\n📁 Saved unused file list to ${outputPath}\n`));
    return;
  }

  if (!modeDelete) {
    console.log(yellow("\n🔍 Unused files preview:\n"));
    unused.forEach((f) =>
      console.log(red("• " + path.relative(root, f).replace(/\\/g, "/")))
    );
    console.log(
      `\n${green("Total:")} ${unused.length} unused file(s). No files were deleted.\n`
    );
    return;
  }

  if (unused.length === 0) {
    console.log(green("✅ No unused files found."));
    return;
  }

  if (!modeYes) {
    console.log(red(`\n⚠️  ${unused.length} unused file(s) will be deleted.`));
    const ok = await confirm("Proceed? (y/N): ");
    if (!ok) {
      console.log(yellow("Aborted. No files deleted."));
      return;
    }
  }

  let deletedCount = 0;
  for (const f of unused) {
    try {
      await fs.unlink(f);
      deletedCount++;
      console.log(red("🗑️ Deleted:"), path.relative(root, f).replace(/\\/g, "/"));
    } catch (err) {
      console.log(yellow("⚠️ Failed to delete:"), f, "-", err.message);
    }
  }

  console.log(green(`\n✅ Deleted ${deletedCount}/${unused.length} files.\n`));
})();
