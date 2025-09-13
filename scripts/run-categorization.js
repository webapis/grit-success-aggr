import { KeywordCategorizer, DefaultCategories } from '../src/categorization/ProductCategorizer.js';
import { Dataset } from 'crawlee';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ silent: true });

// The main function to run the categorization process
async function runCategorization() {
    try {
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
        console.log(`\n✅ Saved categorized products to dataset: '${site}-categorized'`);

    } catch (error) {
        console.error('❌ An error occurred during the categorization process:', error);
        process.exit(1);
    }
}

// Execute the main function
runCategorization();
