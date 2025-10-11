// categorize-products.pipe.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import productCategoryRules from '../src/categorization/rules/category.js';
import colorsRule from '../src/categorization/rules/colors.js';
import genderRule from '../src/categorization/rules/gender.js';
import { categorizeProducts } from '../src/categorization/categorizer.js';
import { countCategorizedItems } from '../src/categorization/countCategorizedItems.js';
import { analyzeProductTitles, getSuggestionsByStatus } from '../src/categorization/analyzeProductTitles.js';

// --- Pipe Utility ---
const pipe = (...fns) => async (initialValue) =>
  fns.reduce(async (acc, fn) => fn(await acc), Promise.resolve(initialValue));

// --- Stages ---

const initializeContext = async (ctx = {}) => {
  dotenv.config({ silent: true });

  const site = process.env.site;
  const baseDir = process.cwd();

  return {
    ...ctx,
    site,
    paths: {
      RAW_DATA_DIR: path.join(baseDir, 'storage', 'datasets', 'default'),
      ARTIFACTS_DIR: path.join(baseDir, 'artifacts'),
      CATEGORIZATION_RESULTS_DIR: path.join(baseDir, 'categorization_results'),
    },
    metadata: {
      startTime: Date.now(),
    },
  };
};

// Stage 1: Validate directories and prepare filesystem
const prepareEnvironment = async (ctx) => {
  const { RAW_DATA_DIR, ARTIFACTS_DIR, CATEGORIZATION_RESULTS_DIR } = ctx.paths;

  console.log('\n📊 Starting independent categorization process...\n');
  console.log(`Reading raw data from: ${RAW_DATA_DIR}\n`);

  if (!fs.existsSync(RAW_DATA_DIR)) {
    throw new Error(`Dataset directory not found: ${RAW_DATA_DIR}`);
  }

  [ARTIFACTS_DIR, CATEGORIZATION_RESULTS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  return { ...ctx, status: 'env_ready' };
};

// Stage 2: Load data
const loadData = async (ctx) => {
  const { RAW_DATA_DIR } = ctx.paths;
  const files = fs.readdirSync(RAW_DATA_DIR).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No JSON files found. Nothing to process.');
    return { ...ctx, items: [], files: [], skipped: true };
  }

  const allItems = [];
  for (const file of files) {
    const filePath = path.join(RAW_DATA_DIR, file);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    try {
      const parsed = JSON.parse(rawData);
      allItems.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch (e) {
      console.warn(`⚠️ Error parsing ${file}: ${e.message}`);
    }
  }

  return { ...ctx, files, items: allItems };
};

// Stage 3: Categorize items
const categorizeItems = async (ctx) => {
  if (ctx.skipped) return ctx;

  const allRules = [...productCategoryRules, ...colorsRule, ...genderRule];
  console.log(`🔍 Categorizing ${ctx.items.length} items from ${ctx.files.length} file(s)...`);

  const categorizedItems = categorizeProducts(ctx.items, allRules, true);
  const outputFile = path.join(ctx.paths.ARTIFACTS_DIR, 'categorized-products.json');

  fs.writeFileSync(outputFile, JSON.stringify(categorizedItems, null, 2));

  console.log('\n--- Categorization Summary ---\n');
  console.log(`Total Items Processed: ${categorizedItems.length}`);
  console.log(`✅ Output: ${outputFile}\n`);

  return { ...ctx, categorizedItems, outputFile };
};

// Stage 4: Generate summary
const generateSummary = async (ctx) => {
  if (ctx.skipped) return ctx;

  const summary = countCategorizedItems(ctx.categorizedItems);
  const summaryFile = path.join(
    ctx.paths.CATEGORIZATION_RESULTS_DIR,
    `categorization-summary-${ctx.site}.json`
  );

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary saved at: ${summaryFile}`);

  return { ...ctx, summary, summaryFile };
};

// Stage 5: Analyze and extract new words
const analyzeTitles = async (ctx) => {
  if (ctx.skipped) return ctx;

  const analysis = analyzeProductTitles(ctx.categorizedItems);
  const newWords = getSuggestionsByStatus(analysis, false);
  const newWordsFile = path.join(
    ctx.paths.CATEGORIZATION_RESULTS_DIR,
    `new-words-${ctx.site}.json`
  );

  fs.writeFileSync(newWordsFile, JSON.stringify(newWords, null, 2));
  console.log(`✅ New words saved at: ${newWordsFile}`);

  return { ...ctx, analysis, newWords, newWordsFile };
};

// Stage 6: Format final output
const finalizeOutput = async (ctx) => {
  const endTime = Date.now();
  const duration = endTime - ctx.metadata.startTime;

  return {
    success: !ctx.error,
    site: ctx.site,
    totalFiles: ctx.files?.length || 0,
    totalItems: ctx.items?.length || 0,
    categorizedCount: ctx.categorizedItems?.length || 0,
    outputFiles: {
      categorized: ctx.outputFile,
      summary: ctx.summaryFile,
      newWords: ctx.newWordsFile,
    },
    durationMs: duration,
    finishedAt: new Date().toISOString(),
    error: ctx.error || null,
  };
};

// --- Compose the Pipeline ---
const pipeline = pipe(
  initializeContext,
  prepareEnvironment,
  loadData,
  categorizeItems,
  generateSummary,
  analyzeTitles,
  finalizeOutput
);

// --- Execute ---
(async () => {
  try {
    const result = await pipeline({});
    console.log('\n✅ Categorization Pipeline Completed Successfully!\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n💥 Pipeline Failed:', error.message);
    process.exit(1);
  }
})();
