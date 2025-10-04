import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const VALIDATED_FILE = path.join(ARTIFACTS_DIR, 'metadata-validated.json');
const CATEGORIZED_FILE = path.join(ARTIFACTS_DIR, 'categorized-products.json');
const FINAL_OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'final-products.json');

async function main() {
    console.log('\n🤝 Starting merge process...\n');

    // --- Read Validated Data ---
    if (!fs.existsSync(VALIDATED_FILE)) {
        console.error(`Error: Validated data file not found at ${VALIDATED_FILE}`);
        console.error('Please run the validation pipeline first.');
        process.exit(1);
    }
    const validatedData = JSON.parse(fs.readFileSync(VALIDATED_FILE, 'utf-8'));
    console.log(`🔍 Found ${validatedData.length} items in validated data.`);

    // --- Read Categorized Data ---
    if (!fs.existsSync(CATEGORIZED_FILE)) {
        console.error(`Error: Categorized data file not found at ${CATEGORIZED_FILE}`);
        console.error('Please run the categorization script first.');
        process.exit(1);
    }
    const categorizedData = JSON.parse(fs.readFileSync(CATEGORIZED_FILE, 'utf-8'));
    console.log(`📊 Found ${categorizedData.length} items in categorized data.`);

    // --- Merge Data ---
    console.log('🔄 Merging datasets based on item ID...');

    // Create a map for quick lookups of categorization data by ID
    const categorizationMap = new Map(categorizedData.map(item => [item.id, item]));

    const mergedData = validatedData.map(validatedItem => {
        const categorizedItem = categorizationMap.get(validatedItem.id);

        if (categorizedItem) {
            // Merge categorization fields into the validated item
            return {
                ...validatedItem,
                categories: categorizedItem.categories,
                seo: categorizedItem.seo,
            };
        }
        // If no matching category data, return the validated item as is
        return validatedItem;
    });

    fs.writeFileSync(FINAL_OUTPUT_FILE, JSON.stringify(mergedData, null, 2));

    console.log('\n--- Merge Summary ---\n');
    console.log(`Total Items Merged: ${mergedData.length}`);
    console.log(`✅ Successfully created final merged dataset at: ${FINAL_OUTPUT_FILE}`);
    console.log('---------------------\n');
}

main().catch(error => {
    console.error('💥 An error occurred during the merge process:', error);
    process.exit(1);
});