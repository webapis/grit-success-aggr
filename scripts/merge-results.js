import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const FINAL_OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'final-products.json');

async function main() {
    console.log('\n🤝 Starting dynamic merge process...\n');

    // --- Find all JSON files in the artifacts directory ---
    const allFiles = fs.readdirSync(ARTIFACTS_DIR);
    const jsonFilesToMerge = allFiles.filter(file =>
        file.endsWith('.json') && path.join(ARTIFACTS_DIR, file) !== FINAL_OUTPUT_FILE
    );

    if (jsonFilesToMerge.length === 0) {
        console.error('No JSON files to merge in the artifacts directory.');
        process.exit(1);
    }

    console.log('🔍 Found the following JSON files to merge:');
    jsonFilesToMerge.forEach(file => console.log(`  - ${file}`));

    // --- Merge Data ---
    console.log('\n🔄 Merging datasets based on item ID...');

    // Create a map for quick lookups and merging of data by ID
    const mergedDataMap = new Map();

    for (const jsonFile of jsonFilesToMerge) {
        const filePath = path.join(ARTIFACTS_DIR, jsonFile);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        console.log(`📊 Processing ${data.length} items from ${jsonFile}`);

        for (const item of data) {
            if (item.id) {
                const existingItem = mergedDataMap.get(item.id) || {};
                // Deep merge of item properties
                mergedDataMap.set(item.id, { ...existingItem, ...item });
            }
        }
    }

    const mergedData = Array.from(mergedDataMap.values());

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
