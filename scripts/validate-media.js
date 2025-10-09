
import fs from 'fs';
import path from 'path';
import { validateItemMedia } from '../src/1_scraping/validation/mediaValidator.js';

const RAW_DATA_DIR = path.join(process.cwd(), 'storage', 'datasets', 'default');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'media-validated.json');

async function main() {
    console.log(`
🔍 Starting media validation process...
`);
    console.log(`Reading data from: ${RAW_DATA_DIR}`);

    if (!fs.existsSync(RAW_DATA_DIR)) {
        console.error(`Error: Dataset directory not found at ${RAW_DATA_DIR}`);
        console.error('Please run the scraping process first to generate data.');
        process.exit(1);
    }

    if (!fs.existsSync(ARTIFACTS_DIR)) {
        fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(RAW_DATA_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.log('No JSON files found in the dataset directory. Nothing to process.');
        return;
    }

    const items = [];
    for (const file of files) {
        const filePath = path.join(RAW_DATA_DIR, file);
        const rawData = fs.readFileSync(filePath, 'utf-8');
        // --- Robustness Check ---
        if (!rawData.trim()) {
            console.warn(`⚠️  Skipping empty file: ${file}`);
            continue;
        }
        try {
            const fileItems = JSON.parse(rawData);
            if (Array.isArray(fileItems)) {
                items.push(...fileItems);
            } else if (fileItems) { // Ensure it's not null/undefined
                items.push(fileItems);
            }
        } catch (e) {
            console.error(`💥 Error parsing JSON from ${file}: ${e.message}`);
        }
    }

    if (!Array.isArray(items) || items.length === 0) {
        console.log('No items found in the input file. Nothing to process.');
        return;
    }

    const allImageUrls = new Map();
    const allItems = [];

    // First pass: Read all items and validate media individually
    console.log(`🔍 Processing ${items.length} item(s)...`);
    for (const item of items) {
        // Assuming a mock siteConfig for now
        const mockSiteConfig = { urls: [item.pageUrl] }; // Use pageUrl for context
        const mediaValidationResult = validateItemMedia(item, mockSiteConfig);

        const enrichedItem = {
            ...item,
            img: mediaValidationResult.processedImages,
            imgValid: mediaValidationResult.imgValid,
            videoValid: mediaValidationResult.videoValid,
            mediaType: mediaValidationResult.mediaType,
            imageAnalysis: { // Nesting image-specific results
                isDuplicate: false, // Default value
                duplicateOf: []
            }
        };

        // Store URLs for cross-item duplicate check
        for (const imgUrl of enrichedItem.img) {
            if (!allImageUrls.has(imgUrl)) {
                allImageUrls.set(imgUrl, []);
            }
            allImageUrls.get(imgUrl).push(item.link); // Store item link
        }
        allItems.push(enrichedItem);
    }

    // Second pass: Identify duplicates
    console.log('🕵️  Checking for duplicate images across all items...');
    for (const item of allItems) {
        for (const imgUrl of item.img) {
            const itemsWithThisImage = allImageUrls.get(imgUrl);
            if (itemsWithThisImage.length > 1) {
                item.imageAnalysis.isDuplicate = true;
                item.imageAnalysis.duplicateOf = itemsWithThisImage.filter(
                    (link) => link !== item.link
                );
                break; // Mark as duplicate and move to the next item
            }
        }
    }

    // Save the final enriched data
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 2));

    console.log(`
--- Media Validation Summary ---
`);
    console.log(`Total Items Processed: ${allItems.length}`);
    console.log(`Unique Image URLs Found: ${allImageUrls.size}`);
    console.log(`✅ Saved media-validated data to: ${OUTPUT_FILE}`);
    console.log(`--------------------------------
`);
}

main().catch(error => {
    console.error('💥 An error occurred during the media validation process:', error);
    process.exit(1);
});
