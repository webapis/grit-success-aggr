// manage-branches.pipe.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// --- Config ---
const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'webapis';
const REPO_NAME = 'grit-2-state';

// --- Utility: Pipe Pattern ---
const pipe = (...fns) => async (initial) =>
  fns.reduce(async (acc, fn) => fn(await acc), Promise.resolve(initial));

// --- Shared Context Initialization ---
const initializeContext = async (ctx = {}) => {
  if (!GITHUB_TOKEN) throw new Error('Missing GitHub token (GH_TOKEN).');

  return {
    ...ctx,
    github: {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      token: GITHUB_TOKEN,
      apiBase: `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
    },
    metadata: { startTime: Date.now() },
  };
};

// --- Step 1: Fetch Main Branch SHA (with caching) ---
const getMainBranchSha = async (ctx) => {
  console.log('🔍 Fetching main branch SHA...');
  const { apiBase, token } = ctx.github;

  const response = await fetch(`${apiBase}/branches/main`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get main branch info: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const sha = data.commit.sha;
  console.log(`✅ Main branch SHA: ${sha.substring(0, 7)}...`);

  return { ...ctx, mainSha: sha };
};

// --- Step 2: Delete Existing Branch (if exists) ---
const deleteBranch = async (ctx) => {
  const { site } = ctx;
  const { apiBase, token } = ctx.github;

  if (site === 'main') {
    console.warn('⚠️ Skipping deletion of main branch.');
    return ctx;
  }

  console.log(`🧹 Attempting to delete branch '${site}'...`);

  const response = await fetch(`${apiBase}/git/refs/heads/${site}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (response.status === 204) {
    console.log(`✅ Deleted branch '${site}'.`);
  } else if (response.status === 404 || response.status === 422) {
    console.log(`ℹ️ Branch '${site}' not found. Skipping deletion.`);
  } else {
    throw new Error(`Failed to delete branch '${site}': ${response.status} ${await response.text()}`);
  }

  return ctx;
};

// --- Step 3: Create Fresh Branch from Main ---
const createBranch = async (ctx) => {
  const { site, mainSha } = ctx;
  const { apiBase, token } = ctx.github;

  console.log(`🌱 Creating fresh branch '${site}' from main...`);

  const response = await fetch(`${apiBase}/git/refs`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: `refs/heads/${site}`,
      sha: mainSha,
    }),
  });

  const body = await response.text();

  if (!response.ok && !(response.status === 422 && body.includes('Reference already exists'))) {
    throw new Error(`Failed to create branch '${site}': ${response.status} - ${body}`);
  }

  if (response.status === 422) {
    console.log(`⚠️ Branch '${site}' already exists (possibly recreated by another process).`);
  } else {
    console.log(`✅ Successfully created branch '${site}'.`);
  }

  return ctx;
};

// --- Step 4: Finalize ---
const finalize = async (ctx) => {
  const duration = Date.now() - ctx.metadata.startTime;
  console.log(`\n✅ Branch management completed in ${duration}ms for '${ctx.site}'.\n`);
  return { success: true, branch: ctx.site, durationMs: duration };
};

// --- Main Pipeline ---
const pipeline = pipe(
  initializeContext,
  getMainBranchSha,
  deleteBranch,
  createBranch,
  finalize
);

// --- Public Function (Entry Point) ---
export async function deletePreviousSamples(site) {
  console.log(`\n🚀 Starting cleanup and recreation of branch '${site}'...\n`);
  try {
    const result = await pipeline({ site });
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ Branch pipeline failed for '${site}':`, error.message);
    process.exit(1);
  }
}
