
const fs = require('fs');
const path = require('path');

const inputFilePath = path.join(__dirname, '..', 'categorization_results', 'uncategorized-products.json');
const outputDirPath = path.join(__dirname, '..', 'categorization_results');

fs.readFile(inputFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    try {
        const products = JSON.parse(data);
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

        for (const categoryType in categorizedProducts) {
            for (const categoryValue in categorizedProducts[categoryType]) {
                const fileName = `${categoryType}-${categoryValue.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                const outputPath = path.join(outputDirPath, fileName);
                fs.writeFile(outputPath, JSON.stringify(categorizedProducts[categoryType][categoryValue], null, 2), 'utf8', (err) => {
                    if (err) {
                        console.error(`Error writing file ${fileName}:`, err);
                    } else {
                        console.log(`Successfully wrote ${fileName}`);
                    }
                });
            }
        }

    } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
    }
});
