
import fs from 'fs';
import path from 'path';
import { validateItemMetadata } from '../src/1_scraping/validation/metadataValidator.js';

const FINAL_OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'final-output');
const FINAL_FILE_PATH = path.join(FINAL_OUTPUT_DIR, 'validated-products.json');

async function main() {
    console.log(`
🔍 Starting metadata validation process...
`);
    console.log(`Reading data from: ${FINAL_FILE_PATH}`);

    if (!fs.existsSync(FINAL_FILE_PATH)) {
        console.error(`Error: Final output file not found at ${FINAL_FILE_PATH}`);
        console.error('Please run the price and media validation scripts first.');
        process.exit(1);
    }

    const rawData = fs.readFileSync(FINAL_FILE_PATH, 'utf-8');
    const items = JSON.parse(rawData);

    if (!Array.isArray(items)) {
        console.error('Error: The input file does not contain a valid JSON array.');
        process.exit(1);
    }

    const enrichedItems = items.map(item => {
        const metadataValidationResult = validateItemMetadata(item);
        return {
            ...item,
            ...metadataValidationResult,
        };
    });

    // Overwrite the file with the final, fully enriched data
    fs.writeFileSync(FINAL_FILE_PATH, JSON.stringify(enrichedItems, null, 2));

    console.log(`
--- Metadata Validation Summary ---
`);
    console.log(`Total Items Processed: ${enrichedItems.length}`);
    console.log(`✅ Successfully updated final validated data at: ${FINAL_FILE_PATH}`);
    console.log(`-----------------------------------
`);
}

main().catch(error => {
    console.error('💥 An error occurred during the metadata validation process:', error);
    process.exit(1);
});
