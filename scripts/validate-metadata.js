import fs from 'fs';
import path from 'path';
import { validateItemMetadata } from '../src/1_scraping/validation/metadataValidator.js';
import { pipe } from './pipe.js';

const RAW_DATA_DIR = path.join(process.cwd(), 'storage', 'datasets', 'default');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'metadata-validated.json');

// --- Custom Error for controlled exits ---
class EarlyExitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EarlyExitError';
  }
}

// --- Stage 1: Initialize Context ---
const initializeContext = async (context) => {
  console.log('\n🔍 Starting metadata validation process...\n');
  console.log(`Reading data from: ${RAW_DATA_DIR}\n`);

  if (!fs.existsSync(RAW_DATA_DIR)) {
    throw new Error(`Dataset directory not found at ${RAW_DATA_DIR}. Please run the scraping process first.`);
  }

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(RAW_DATA_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    throw new EarlyExitError('No JSON files found in the dataset directory.');
  }

  return { ...context, files };
};

// --- Stage 2: Load and Parse Files ---
const loadAndParseFiles = async (context) => {
  const { files } = context;
  const items = [];

  for (const file of files) {
    const filePath = path.join(RAW_DATA_DIR, file);
    const rawData = fs.readFileSync(filePath, 'utf-8');

    if (!rawData.trim()) {
      console.warn(`⚠️ Skipping empty file: ${file}`);
      continue;
    }

    try {
      const fileItems = JSON.parse(rawData);
      if (Array.isArray(fileItems)) {
        items.push(...fileItems);
      } else if (fileItems) {
        items.push(fileItems);
      }
    } catch (e) {
      console.error(`💥 Error parsing JSON from ${file}: ${e.message}`);
    }
  }

  if (items.length === 0) {
    throw new EarlyExitError('No valid items found to process after parsing.');
  }

  console.log(`🔍 Loaded ${items.length} item(s) from ${files.length} file(s).`);
  return { ...context, items };
};

// --- Stage 3: Validate Metadata ---
const validateMetadata = async (context) => {
  const { items } = context;

  console.log(`🔍 Validating metadata for ${items.length} item(s)...`);

  const enrichedItems = items.map(item => {
    const result = validateItemMetadata(item);
    return { ...item, ...result };
  });

  return { ...context, enrichedItems };
};

// --- Stage 4: Save Results ---
const saveResults = async (context) => {
  const { enrichedItems } = context;
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedItems, null, 2));

  console.log(`✅ Saved metadata-validated data to: ${OUTPUT_FILE}`);
  return { ...context, totalItems: enrichedItems.length };
};

// --- Stage 5: Print Summary ---
const printSummary = async (context) => {
  console.log('\n--- Metadata Validation Summary ---\n');
  console.log(`Total Items Processed: ${context.totalItems}`);
  console.log(`✅ Successfully created final validated data at: ${OUTPUT_FILE}`);
  console.log('-----------------------------------\n');
  return context;
};

// --- Pipeline Definition ---
const validateMetadataPipeline = pipe(
  initializeContext,
  loadAndParseFiles,
  validateMetadata,
  saveResults,
  printSummary
);

// --- Main Execution ---
async function main() {
  try {
    await validateMetadataPipeline({});
    console.log('🎉 Metadata validation pipeline completed successfully.');
  } catch (error) {
    if (error instanceof EarlyExitError) {
      console.log(`➡️ Pipeline exited early: ${error.message}`);
    } else {
      console.error('💥 Fatal error in metadata validation process:', error);
      process.exit(1);
    }
  }
}

main();
