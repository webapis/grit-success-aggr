import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipe } from './pipe.js';

// --- Pipeline Stages ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initialize = (context) => {
    console.log('Initializing category processing...');
    return {
        ...context,
        inputFilePath: path.join(__dirname, '..', 'categorization_results', 'uncategorized-products.json'),
        outputDirPath: path.join(__dirname, '..', 'categorization_results'),
    };
};

const loadUncategorizedProducts = async (context) => {
    const { inputFilePath } = context;
    console.log(`Reading uncategorized products from: ${inputFilePath}`);
    try {
        const data = await fs.readFile(inputFilePath, 'utf8');
        return { ...context, products: JSON.parse(data) };
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(`Input file not found at ${inputFilePath}. Please run the categorization script first.`);
        }
        throw err; // Rethrow other errors
    }
};

const categorizeProducts = (context) => {
    const { products } = context;
    console.log(`Categorizing ${products.length} products...`);
    const categorizedProducts = {};

    products.forEach(product => {
        if (product.categories) {
            for (const categoryType in product.categories) {
                const categories = product.categories[categoryType];
                categories.forEach(categoryValue => {
                    if (!categorizedProducts[categoryType]) {
                        categorizedProducts[categoryType] = {};
                    }
                    if (!categorizedProducts[categoryType][categoryValue]) {
                        categorizedProducts[categoryType][categoryValue] = [];
                    }
                    categorizedProducts[categoryType][categoryValue].push(product);
                });
            }
        }
    });

    console.log('Products categorized successfully.');
    return { ...context, categorizedProducts };
};

const saveCategorizedProducts = async (context) => {
    const { outputDirPath, categorizedProducts } = context;
    console.log(`Saving categorized products to: ${outputDirPath}`);
    const savePromises = [];

    for (const categoryType in categorizedProducts) {
        for (const categoryValue in categorizedProducts[categoryType]) {
            const fileName = `${categoryType}-${categoryValue.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
            const outputPath = path.join(outputDirPath, fileName);
            const content = JSON.stringify(categorizedProducts[categoryType][categoryValue], null, 2);
            
            const promise = fs.writeFile(outputPath, content, 'utf8').then(() => {
                console.log(`Successfully wrote ${fileName}`);
            }).catch(err => {
                console.error(`Error writing file ${fileName}:`, err);
            });
            savePromises.push(promise);
        }
    }

    await Promise.all(savePromises);
    console.log('All categorized files have been saved.');
    return context;
};

// --- Pipeline Definition ---

const processCategoriesPipeline = pipe(
    initialize,
    loadUncategorizedProducts,
    categorizeProducts,
    saveCategorizedProducts
);

// --- Main Execution ---

(async () => {
    try {
        await processCategoriesPipeline({});
        console.log('✅ Category processing pipeline completed successfully.');
    } catch (error) {
        console.error('💥 An error occurred during the category processing pipeline:', error.message);
        process.exit(1);
    }
})();