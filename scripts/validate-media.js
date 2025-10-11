import fs from 'fs';
import path from 'path';
import { validateItemMedia } from '../src/1_scraping/validation/mediaValidator.js';
import { pipe } from './pipe.js';

// --- Constants ---
const RAW_DATA_DIR = path.join(process.cwd(), 'storage', 'datasets', 'default');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'media-validated.json');

// --- Custom Error for controlled exits ---
class EarlyExitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EarlyExitError';
  }
}

// --- Stage 1: Initialize Context ---
const initializeContext = async (context) => {
  console.log(`
🔍 Starting media validation process...
`);
  console.log(`Reading data from: ${RAW_DATA_DIR}`);

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

  return { ...context, files, items: [] };
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

// --- Stage 3: Validate Media ---
const validateMedia = async (context) => {
  const { items } = context;
  const allImageUrls = new Map();
  const allItems = [];

  console.log(`🔍 Validating media for ${items.length} item(s)...`);

  for (const item of items) {
    const mockSiteConfig = { urls: [item.pageUrl] };
    const mediaResult = validateItemMedia(item, mockSiteConfig);

    const enrichedItem = {
      ...item,
      img: mediaResult.processedImages,
      imgValid: mediaResult.imgValid,
      videoValid: mediaResult.videoValid,
      mediaType: mediaResult.mediaType,
      imageAnalysis: {
        isDuplicate: false,
        duplicateOf: []
      }
    };

    for (const imgUrl of enrichedItem.img) {
      if (!allImageUrls.has(imgUrl)) {
        allImageUrls.set(imgUrl, []);
      }
      allImageUrls.get(imgUrl).push(item.link);
    }

    allItems.push(enrichedItem);
  }

  return { ...context, allItems, allImageUrls };
};

// --- Stage 4: Detect Duplicates ---
const detectDuplicates = async (context) => {
  const { allItems, allImageUrls } = context;

  console.log('🕵️ Checking for duplicate images across all items...');

  for (const item of allItems) {
    for (const imgUrl of item.img) {
      const relatedItems = allImageUrls.get(imgUrl);
      if (relatedItems.length > 1) {
        item.imageAnalysis.isDuplicate = true;
        item.imageAnalysis.duplicateOf = relatedItems.filter(link => link !== item.link);
        break;
      }
    }
  }

  return context;
};

// --- Stage 5: Save Results ---
const saveResults = async (context) => {
  const { allItems } = context;
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 2));

  console.log(`✅ Saved media-validated data to: ${OUTPUT_FILE}`);
  return { ...context, totalItems: allItems.length };
};

// --- Stage 6: Print Summary ---
const printSummary = async (context) => {
  console.log(`
--- Media Validation Summary ---
`);
  console.log(`Total Items Processed: ${context.totalItems}`);
  console.log(`Unique Image URLs Found: ${context.allImageUrls.size}`);
  console.log('--------------------------------\n');
  return context;
};

// --- Pipeline Definition ---
const validateMediaPipeline = pipe(
  initializeContext,
  loadAndParseFiles,
  validateMedia,
  detectDuplicates,
  saveResults,
  printSummary
);

// --- Main Execution ---
async function main() {
  try {
    await validateMediaPipeline({});
    console.log('🎉 Media validation pipeline completed successfully.');
  } catch (error) {
    if (error instanceof EarlyExitError) {
      console.log(`➡️ Pipeline exited early: ${error.message}`);
    } else {
      console.error('💥 Fatal error in media validation process:', error);
      process.exit(1);
    }
  }
}

main();
