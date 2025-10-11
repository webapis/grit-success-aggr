import fs from 'fs';
import path from 'path';
import processAllPrices from '../src/1_scraping/validation/priceParcer.js';
import { pipe } from './pipe.js';

const RAW_DATA_DIR = path.join(process.cwd(), 'storage', 'datasets', 'default');
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts');

// --- Custom Error for controlled exits ---
class EarlyExitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EarlyExitError';
  }
}

// --- Stage 1: Initialize Context ---
const initializeContext = async (context) => {
  console.log('🔍 Starting price validation process...');
  console.log(`Reading data from: ${RAW_DATA_DIR}`);

  if (!fs.existsSync(RAW_DATA_DIR)) {
    throw new Error(`Dataset directory not found at ${RAW_DATA_DIR}. Please run the scraping process first.`);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(RAW_DATA_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    throw new EarlyExitError('No JSON files found in the dataset directory.');
  }

  return { ...context, files, totalItemsProcessed: 0, totalValidItems: 0, allProcessedItems: [] };
};

// --- Stage 2: Load and Parse Files ---
const loadAndParseFiles = async (context) => {
  const { files } = context;
  const parsedData = [];

  for (const file of files) {
    const filePath = path.join(RAW_DATA_DIR, file);
    const rawData = fs.readFileSync(filePath, 'utf-8');

    if (!rawData.trim()) {
      console.warn(`⚠️ Skipping empty file: ${file}`);
      continue;
    }

    try {
      let items = JSON.parse(rawData);
      if (!Array.isArray(items)) items = [items];
      if (items.length === 0) {
        console.warn(`⚠️ Skipping file ${file}: Contains no items.`);
        continue;
      }
      parsedData.push({ file, items });
    } catch (err) {
      console.error(`💥 Error parsing ${file}: ${err.message}`);
    }
  }

  if (parsedData.length === 0) {
    throw new EarlyExitError('No valid JSON data to process after parsing.');
  }

  return { ...context, parsedData };
};

// --- Stage 3: Validate Prices ---
const validatePrices = async (context) => {
  const { parsedData } = context;
  const allProcessedItems = [];
  let totalItemsProcessed = 0;
  let totalValidItems = 0;

  for (const { file, items } of parsedData) {
    console.log(`🔍 Processing ${items.length} item(s) from ${file}...`);

    for (const item of items) {
      const mockSiteConfig = { conversionRate: 1 };
      const result = await processAllPrices(item, mockSiteConfig);

      allProcessedItems.push({
        ...item,
        priceAnalysis: result
      });

      totalItemsProcessed++;
      if (result.priceValid) totalValidItems++;
    }
  }

  return { ...context, allProcessedItems, totalItemsProcessed, totalValidItems };
};

// --- Stage 4: Save Results ---
const saveResults = async (context) => {
  const outputFilePath = path.join(OUTPUT_DIR, 'price-validated.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(context.allProcessedItems, null, 2));

  console.log(`\n✅ Saved all price-validated data to: ${outputFilePath}`);
  return { ...context, outputFilePath };
};

// --- Stage 5: Print Summary ---
const printSummary = async (context) => {
  console.log(`
--- Validation Summary ---
`);
  console.log(`Total Files Processed: ${context.files.length}`);
  console.log(`Total Items Processed: ${context.totalItemsProcessed}`);
  console.log(`Items with Valid Prices: ${context.totalValidItems}`);
  console.log('--------------------------\n');

  return context;
};

// --- Pipeline Definition ---
const validatePricePipeline = pipe(
  initializeContext,
  loadAndParseFiles,
  validatePrices,
  saveResults,
  printSummary
);

// --- Main Execution ---
async function main() {
  try {
    await validatePricePipeline({});
    console.log('🎉 Price validation pipeline completed successfully.');
  } catch (error) {
    if (error instanceof EarlyExitError) {
      console.log(`➡️ Pipeline exited early: ${error.message}`);
    } else {
      console.error('💥 Fatal error in price validation process:', error);
      process.exit(1);
    }
  }
}

main();
