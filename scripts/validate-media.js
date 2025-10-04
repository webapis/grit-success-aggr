
import fs from 'fs';
import path from 'path';
import { validateItemMedia } from '../src/1_scraping/validation/mediaValidator.js';

const TEMP_DIR = path.join(process.cwd(), 'artifacts', 'temp-validation');
const FINAL_OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'final-output');

async function main() {
    console.log(`
🔍 Starting media validation process...
`);
    console.log(`Reading data from: ${TEMP_DIR}`);

    if (!fs.existsSync(TEMP_DIR)) {
        console.error(`Error: Intermediate directory not found at ${TEMP_DIR}`);
        console.error('Please run the price validation script first.');
        process.exit(1);
    }

    if (!fs.existsSync(FINAL_OUTPUT_DIR)) {
        fs.mkdirSync(FINAL_OUTPUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(TEMP_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.log('No JSON files found in the temp directory. Nothing to process.');
        return;
    }

    const allImageUrls = new Map();
    const allItems = [];

    // First pass: Read all items and validate media individually
    for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        const rawData = fs.readFileSync(filePath, 'utf-8');
        let items = JSON.parse(rawData);

        // Handle both single object and array of objects
        if (!Array.isArray(items)) {
            items = [items]; // Wrap single object in an array
        }

        if (items.length === 0) {
            console.warn(`⚠️  Skipping file ${file}: Contains no items.`);
            continue;
        }
        console.log(`🔍 Processing ${items.length} item(s) from ${file}...`);

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
    }

    // Second pass: Identify duplicates
    for (const item of allItems) {
        for (const imgUrl of item.img) {
            const itemsWithThisImage = allImageUrls.get(imgUrl);
            if (itemsWithThisImage.length > 1) {
                item.imageAnalysis.isDuplicate = true;
                item.imageAnalysis.duplicateOf = itemsWithThisImage.filter(link => link !== item.link);
                break; // Mark as duplicate and move to the next item
            }
        }
    }

    // Save the final enriched data
    const outputFilePath = path.join(FINAL_OUTPUT_DIR, 'validated-products.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(allItems, null, 2));

    console.log(`
--- Media Validation Summary ---
`);
    console.log(`Total Items Processed: ${allItems.length}`);
    console.log(`Unique Image URLs Found: ${allImageUrls.size}`);
    console.log(`✅ Saved final validated data to: ${outputFilePath}`);
    console.log(`--------------------------------
`);
}

main().catch(error => {
    console.error('💥 An error occurred during the media validation process:', error);
    process.exit(1);
});
