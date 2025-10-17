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
  const SKIPPED_DIR = path.join(ARTIFACTS_DIR, 'skipped'); // New
  const INVALID_DIR = path.join(ARTIFACTS_DIR, 'invalid'); // New
  const VALID_DIR = path.join(ARTIFACTS_DIR, 'valid'); // New

  // Create directories if they don't exist
  if (!fs.existsSync(SKIPPED_DIR)) fs.mkdirSync(SKIPPED_DIR, { recursive: true });
  if (!fs.existsSync(INVALID_DIR)) fs.mkdirSync(INVALID_DIR, { recursive: true });
  if (!fs.existsSync(VALID_DIR)) fs.mkdirSync(VALID_DIR, { recursive: true });


  return {
    ...ctx,
    paths: { ARTIFACTS_DIR, FINAL_OUTPUT_FILE, SKIPPED_DIR, INVALID_DIR, VALID_DIR }, // Modified
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

  return { ...ctx, jsonFilesToMerge, skippedItems: [] }; // Modified
};

// --- Stage 3: Merge Files ---
const mergeFiles = async (ctx) => {
  const { ARTIFACTS_DIR } = ctx.paths;
  const { jsonFilesToMerge } = ctx;

  console.log('\n🔄 Merging datasets based on item ID...\n');

  const mergedDataMap = new Map();
  const skippedItems = []; // New

  for (const jsonFile of jsonFilesToMerge) {
    const filePath = path.join(ARTIFACTS_DIR, jsonFile);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    try {
      const data = JSON.parse(fileContent);
      console.log(`📊 Processing ${data.length} items from ${jsonFile}`);

      for (const item of data) {
        if (item.link == null) { // New check
          skippedItems.push(item);
          continue;
        }
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
    console.warn(
      '⚠️ Merge Warning: 0 items were merged. Possibly missing "id" fields or all items were skipped.'
    );
  }

  return { ...ctx, mergedData, skippedItems }; // Modified
};

// --- New Stage: Validate Data ---
const validateData = async (ctx) => {
    console.log('\n🔍 Validating merged data...');
    const { mergedData } = ctx;
    const validItems = [];
    const invalidItems = [];

    for (const item of mergedData) {
        let isValid = true;

        if (item.priceValid === false ||
            item.linkValid === false ||
            item.titleValid === false ||
            item.priceScrapeError === true) {
            isValid = false;
        }

        if (item.mediaType === 'image' && item.imgValid === false) {
            isValid = false;
        }

        if (item.mediaType === 'video' && item.videoValid === false) {
            isValid = false;
        }

        if (isValid) {
            validItems.push(item);
        } else {
            invalidItems.push(item);
        }
    }

    console.log(`📊 Validation complete: ${validItems.length} valid, ${invalidItems.length} invalid.`);
    return { ...ctx, validItems, invalidItems };
}


// --- Stage 4: Clean Up ---
const cleanData = async (ctx) => {
  console.log('\n🧹 Cleaning up redundant fields...\n');
  // Clean both valid and invalid items
  const cleanValidItems = ctx.validItems.map((item) => {
    const newItem = { ...item };
    if (newItem.priceAnalysis && newItem.price) delete newItem.price;
    if (newItem.seo?.tags) delete newItem.seo.tags;
    return newItem;
  });

  const cleanInvalidItems = ctx.invalidItems.map((item) => {
    const newItem = { ...item };
    if (newItem.priceAnalysis && newItem.price) delete newItem.price;
    if (newItem.seo?.tags) delete newItem.seo.tags;
    return newItem;
  });

  return { ...ctx, cleanedData: cleanValidItems, invalidItems: cleanInvalidItems }; // 'cleanedData' now refers to valid items
};

// --- Stage 5: Save Output ---
const saveOutput = async (ctx) => {
  const { VALID_DIR, INVALID_DIR, SKIPPED_DIR } = ctx.paths;
  const { cleanedData, invalidItems, skippedItems } = ctx;

  const validOutputFile = path.join(VALID_DIR, 'valid-products.json');
  const invalidOutputFile = path.join(INVALID_DIR, 'invalid-products.json');
  const skippedOutputFile = path.join(SKIPPED_DIR, 'skipped-products.json');

  fs.writeFileSync(validOutputFile, JSON.stringify(cleanedData, null, 2));
  fs.writeFileSync(invalidOutputFile, JSON.stringify(invalidItems, null, 2));
  fs.writeFileSync(skippedOutputFile, JSON.stringify(skippedItems, null, 2));


  console.log('\n--- Merge Summary ---\n');
  console.log(`Total Items Merged (Valid): ${cleanedData.length}`);
  console.log(`Total Items Merged (Invalid): ${invalidItems.length}`);
  console.log(`Total Items Skipped (no link): ${skippedItems.length}`);
  console.log(`✅ Successfully created valid merged dataset at: ${validOutputFile}`);
  console.log(`✅ Successfully created invalid merged dataset at: ${invalidOutputFile}`);
  console.log(`✅ Successfully created skipped items dataset at: ${skippedOutputFile}`);
  console.log('---------------------\n');

  return { ...ctx, outputFile: validOutputFile }; // For finalize stage, point to the main valid output
};

// --- Stage 6: Finalize Output ---
const finalize = async (ctx) => {
  const endTime = Date.now();
  const duration = endTime - ctx.metadata.startTime;

  return {
    success: true,
    totalFilesMerged: ctx.jsonFilesToMerge.length,
    totalValidItems: ctx.cleanedData.length,
    totalInvalidItems: ctx.invalidItems.length,
    totalSkippedItems: ctx.skippedItems.length,
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
  validateData, // New stage
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
    console.error('\n💥 Merge Pipeline Failed:\n', error.message);
    process.exit(1);
  }
})();