
import fs from 'fs';
import path from 'path';
import processAllPrices from '../src/1_scraping/validation/priceParcer.js';

const DATASET_DIR = path.join(process.cwd(), 'storage', 'datasets', 'default');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts', 'temp-validation');

async function main() {
    console.log(`🔍 Starting price validation process...`);
    console.log(`Reading data from: ${DATASET_DIR}`);

    if (!fs.existsSync(DATASET_DIR)) {
        console.error(`Error: Dataset directory not found at ${DATASET_DIR}`);
        console.error('Please run the scraping process first to generate data.');
        process.exit(1);
    }

    if (!fs.existsSync(ARTIFACTS_DIR)) {
        fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(DATASET_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.log('No JSON files found in the dataset directory. Nothing to process.');
        return;
    }

    let totalItemsProcessed = 0;
    let totalValidItems = 0;

    for (const file of files) {
        const filePath = path.join(DATASET_DIR, file);
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

        const processedItems = [];
        for (const item of items) {
            // Assuming a mock siteConfig for now, as it's not available in this context
            // You may need to pass a proper siteConfig if currency conversion is needed
            const mockSiteConfig = { conversionRate: 1 }; 
            const result = await processAllPrices(item, mockSiteConfig);
            
            processedItems.push({
                ...item,
                priceAnalysis: result
            });

            totalItemsProcessed++;
            if (result.priceValid) {
                totalValidItems++;
            }
        }

        const outputFileName = `validated_${file}`;
        const outputFilePath = path.join(ARTIFACTS_DIR, outputFileName);
        fs.writeFileSync(outputFilePath, JSON.stringify(processedItems, null, 2));
        console.log(`✅ Saved validated data to: ${outputFilePath}`);
    }

    console.log(`
--- Validation Summary ---
`);
    console.log(`Total Files Processed: ${files.length}`);
    console.log(`Total Items Processed: ${totalItemsProcessed}`);
    console.log(`Items with Valid Prices: ${totalValidItems}`);
    console.log(`--------------------------
`);
}

main().catch(error => {
    console.error('💥 An error occurred during the price validation process:', error);
    process.exit(1);
});
