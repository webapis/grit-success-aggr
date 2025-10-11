// merge-artifacts.pipe.js
import fs from 'fs';
import path from 'path';

// --- Utility: Pipe Pattern ---
const pipe = (...fns) => async (initial) =>
  fns.reduce(async (acc, fn) => fn(await acc), Promise.resolve(initial));

// --- Stage 1: Initialize Context ---
const initializeContext = async (ctx = {}) => {
  const baseDir = process.cwd();
  const ARTIFACTS_DIR = path.join(baseDir, 'artifacts');
  const FINAL_OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'final-products.json');

  return {
    ...ctx,
    paths: { ARTIFACTS_DIR, FINAL_OUTPUT_FILE },
    metadata: { startTime: Date.now() },
  };
};

// --- Stage 2: Validate Environment ---
const validateEnvironment = async (ctx) => {
  const { ARTIFACTS_DIR } = ctx.paths;
  console.log('\n🤝 Starting dynamic merge process...\n');

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    throw new Error(`Artifacts directory not found: ${ARTIFACTS_DIR}`);
  }

  const allFiles = fs.readdirSync(ARTIFACTS_DIR);
  const jsonFilesToMerge = allFiles.filter(
    (file) => file.endsWith('.json') && file !== 'final-products.json'
  );

  if (jsonFilesToMerge.length === 0) {
    throw new Error('No JSON files to merge in the artifacts directory.');
  }

  console.log('🔍 Found the following JSON files to merge:');
  jsonFilesToMerge.forEach((file) => console.log(`  - ${file}`));

  return { ...ctx, jsonFilesToMerge };
};

// --- Stage 3: Merge Files ---
const mergeFiles = async (ctx) => {
  const { ARTIFACTS_DIR } = ctx.paths;
  const { jsonFilesToMerge } = ctx;

  console.log('\n🔄 Merging datasets based on item ID...');

  const mergedDataMap = new Map();

  for (const jsonFile of jsonFilesToMerge) {
    const filePath = path.join(ARTIFACTS_DIR, jsonFile);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    try {
      const data = JSON.parse(fileContent);
      console.log(`📊 Processing ${data.length} items from ${jsonFile}`);

      for (const item of data) {
        if (item.id) {
          const existing = mergedDataMap.get(item.id) || {};
          mergedDataMap.set(item.id, { ...existing, ...item });
        }
      }
    } catch (e) {
      console.warn(`⚠️ Skipped ${jsonFile} due to parse error: ${e.message}`);
    }
  }

  const mergedData = Array.from(mergedDataMap.values());

  if (mergedData.length === 0 && jsonFilesToMerge.length > 0) {
    throw new Error(
      '💥 Merge Error: 0 items were merged. Possibly missing "id" fields.'
    );
  }

  return { ...ctx, mergedData };
};

// --- Stage 4: Clean Up ---
const cleanData = async (ctx) => {
  console.log('\n🧹 Cleaning up redundant fields...');
  const cleanedData = ctx.mergedData.map((item) => {
    const newItem = { ...item };
    if (newItem.priceAnalysis && newItem.price) delete newItem.price;
    if (newItem.seo?.tags) delete newItem.seo.tags;
    return newItem;
  });

  return { ...ctx, cleanedData };
};

// --- Stage 5: Save Output ---
const saveOutput = async (ctx) => {
  const { FINAL_OUTPUT_FILE } = ctx.paths;
  fs.writeFileSync(FINAL_OUTPUT_FILE, JSON.stringify(ctx.cleanedData, null, 2));

  console.log('\n--- Merge Summary ---\n');
  console.log(`Total Items Merged: ${ctx.cleanedData.length}`);
  console.log(`✅ Successfully created final merged dataset at: ${FINAL_OUTPUT_FILE}`);
  console.log('---------------------\n');

  return { ...ctx, outputFile: FINAL_OUTPUT_FILE };
};

// --- Stage 6: Finalize Output ---
const finalize = async (ctx) => {
  const endTime = Date.now();
  const duration = endTime - ctx.metadata.startTime;

  return {
    success: true,
    totalFilesMerged: ctx.jsonFilesToMerge.length,
    totalItems: ctx.cleanedData.length,
    outputFile: ctx.outputFile,
    durationMs: duration,
    finishedAt: new Date().toISOString(),
  };
};

// --- Compose Pipeline ---
const pipeline = pipe(
  initializeContext,
  validateEnvironment,
  mergeFiles,
  cleanData,
  saveOutput,
  finalize
);

// --- Run Pipeline ---
(async () => {
  try {
    const result = await pipeline({});
    console.log('\n✅ Merge Pipeline Completed Successfully!\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n💥 Merge Pipeline Failed:', error.message);
    process.exit(1);
  }
})();
