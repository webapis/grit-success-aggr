
import fs from 'fs';
import path from 'path';
import { validateItemMetadata } from '../src/1_scraping/validation/metadataValidator.js';
const RAW_DATA_DIR = path.join(process.cwd(), 'storage', 'datasets', 'default');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'metadata-validated.json');

async function main() {
    console.log('\n🔍 Starting metadata validation process...\n');
    console.log(`Reading data from: ${RAW_DATA_DIR}\n`);

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
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedItems, null, 2));

    console.log('\n--- Metadata Validation Summary ---\n');
    console.log(`Total Items Processed: ${enrichedItems.length}`);
    console.log(`✅ Successfully created final validated data at: ${OUTPUT_FILE}`);
    console.log('-----------------------------------\n');
}

main().catch(error => {
    console.error('💥 An error occurred during the metadata validation process:', error);
    process.exit(1);
});
