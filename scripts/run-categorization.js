import { KeywordCategorizer, DefaultCategories } from '../src/categorization/ProductCategorizer.js';
import { Dataset } from 'crawlee';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

const outputDir = 'categorization_results';

// Load environment variables
dotenv.config({ silent: true });

function getUncategorizedStats(uncategorizedProducts) {
    const stats = {
        missingGender: 0,
        missingProductType: 0,
        missingColor: 0,
        missingSize: 0,
        missingStyle: 0,
        missingMaterial: 0
    };

    for (const product of uncategorizedProducts) {
        if (!product.categories.gender || product.categories.gender.length === 0) {
            stats.missingGender++;
        }
        if (!product.categories.productType || product.categories.productType.length === 0) {
            stats.missingProductType++;
        }
        if (!product.categories.color || product.categories.color.length === 0) {
            stats.missingColor++;
        }
        if (!product.categories.size || product.categories.size.length === 0) {
            stats.missingSize++;
        }
        if (!product.categories.style || product.categories.style.length === 0) {
            stats.missingStyle++;
        }
        if (!product.categories.material || product.categories.material.length === 0) {
            stats.missingMaterial++;
        }
    }
    return stats;
}

async function splitUncategorizedProducts(uncategorizedProducts, outputDirPath) {
    const missingCategoryGroups = {};
    const categoryTypesToCheck = ['gender', 'productType', 'color', 'size', 'style', 'material'];

    uncategorizedProducts.forEach(product => {
        for (const categoryType of categoryTypesToCheck) {
            // Check if the category property is missing or if it's an empty array
            if (!product.categories || !product.categories[categoryType] || product.categories[categoryType].length === 0) {
                if (!missingCategoryGroups[categoryType]) {
                    missingCategoryGroups[categoryType] = [];
                }
                missingCategoryGroups[categoryType].push(product);
            }
        }
    });

    for (const categoryType in missingCategoryGroups) {
        const fileName = `uncategorized-${categoryType}-products.json`;
        const outputPath = path.join(outputDirPath, fileName);
        await fs.writeFile(outputPath, JSON.stringify(missingCategoryGroups[categoryType], null, 2), 'utf8');
        console.log(`Successfully wrote ${fileName}`);
    }
}

// The main function to run the categorization process
async function runCategorization() {
    try {
        await fs.mkdir(outputDir, { recursive: true });
        // Get the site name from environment variables, which often corresponds to the dataset name
        const site = process.env.site;
        if (!site) {
            throw new Error('The "site" environment variable is not set. It is needed to identify the dataset.');
        }

        console.log(`🚀 Starting categorization for site: ${site}`);

        // 1. Open the dataset associated with the site.
        // Crawlee stores data in named datasets. Usually, the name is the site you're scraping.
        const dataset = await Dataset.open(site);

        // 2. Retrieve the data from the dataset.
        // The .getData() method returns an object with an 'items' array.
        const { items: products } = await dataset.getData();

        if (!products || products.length === 0) {
            console.log('✅ No products found in the dataset to categorize.');
            return;
        }

        console.log(`Found ${products.length} products to categorize.`);

        // 3. Initialize the categorizer with your predefined categories.
        const categorizer = new KeywordCategorizer(DefaultCategories);

        // 4. Categorize all the products.
        const categorizedProducts = categorizer.categorize(products);

        // 5. Log the results for verification.
        console.log('=== Categorization Complete ===');
        console.log(`Successfully categorized ${categorizedProducts.length} products.`);

        // Log a sample of the categorized data
        if (categorizedProducts.length > 0) {
            console.log('\nSample of categorized product:');
            console.log(JSON.stringify(categorizedProducts[0], null, 2));
        }

        // 6. Save the enriched data to a new dataset.
        const outputDataset = await Dataset.open(`${site}-categorized`);
        await outputDataset.pushData(categorizedProducts);
        console.log(`
✅ Saved categorized products to dataset: '${site}-categorized'`);

        // 7. Get and save category statistics
        const stats = categorizer.getCategoryStats(categorizedProducts);
        await fs.writeFile(path.join(outputDir, 'categorization-stats.json'), JSON.stringify(stats, null, 2));
        console.log(`
✅ Saved categorization stats to ${path.join(outputDir, 'categorization-stats.json')}`);

        // 8. Find and save uncategorized products
        const uncategorizedProducts = categorizer.findUncategorized(categorizedProducts);
        await fs.writeFile(path.join(outputDir, 'uncategorized-products.json'), JSON.stringify(uncategorizedProducts, null, 2));
        console.log(`
✅ Saved uncategorized products to ${path.join(outputDir, 'uncategorized-products.json')}`);

        // NEW STEP: Split uncategorized products by missing category type
        if (uncategorizedProducts.length > 0) {
            console.log('\n📦 Splitting uncategorized products by missing category type...');
            await splitUncategorizedProducts(uncategorizedProducts, outputDir);
        } else {
            console.log('\nNo uncategorized products to split.');
        }

        // 9. Get and save uncategorized products statistics
        const uncategorizedStats = getUncategorizedStats(uncategorizedProducts);
        await fs.writeFile(path.join(outputDir, 'uncategorized-stats.json'), JSON.stringify(uncategorizedStats, null, 2));
        console.log(`
✅ Saved uncategorized products stats to ${path.join(outputDir, 'uncategorized-stats.json')}`);

        // 10. Suggest keywords for uncategorized products
        console.log('\n🔍 Generating keyword suggestions for uncategorized products...');

        const suggestions = categorizer.suggestKeywords(categorizedProducts, DefaultCategories);
        
        await fs.writeFile(path.join(outputDir, 'keyword-suggestions.json'), JSON.stringify(suggestions, null, 2));
        console.log(`\n✅ Saved keyword suggestions to ${path.join(outputDir, 'keyword-suggestions.json')}`);
        console.log('Top suggestions:', suggestions.slice(0, 10));

    } catch (error) {
        console.error('❌ An error occurred during the categorization process:', error);
        process.exit(1);
    }
}

// Execute the main function
runCategorization();
