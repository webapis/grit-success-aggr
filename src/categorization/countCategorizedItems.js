function countCategorizedItems(products) {
    const result = {
        categoryCounts: {},
        totals: {
            totalItems: products.length,
            categorizedItems: 0,
            uncategorizedItems: 0
        }
    };
    
    // Track which items have been categorized
    const categorizedItemsSet = new Set();
    
    products.forEach((product, index) => {
        let itemHasCategories = false;
        
        // Check if product has categories property
        if (product.categories && typeof product.categories === 'object') {
            // Iterate through each category type (productType, color, etc.)
            Object.keys(product.categories).forEach(categoryType => {
                const categoryValues = product.categories[categoryType];
                
                // Initialize category type if not exists
                if (!result.categoryCounts[categoryType]) {
                    result.categoryCounts[categoryType] = {};
                }
                
                // Count each category value
                if (Array.isArray(categoryValues)) {
                    categoryValues.forEach(value => {
                        if (value && value.trim()) { // Only count non-empty values
                            const cleanValue = value.trim();
                            result.categoryCounts[categoryType][cleanValue] = 
                                (result.categoryCounts[categoryType][cleanValue] || 0) + 1;
                            itemHasCategories = true;
                        }
                    });
                }
            });
        }
        
        // Track if this item has any categories
        if (itemHasCategories) {
            categorizedItemsSet.add(index);
        }
    });
    
    // Calculate totals
    result.totals.categorizedItems = categorizedItemsSet.size;
    result.totals.uncategorizedItems = result.totals.totalItems - result.totals.categorizedItems;
    
    return result;
}


// Test the function


// Alternative version that also returns category percentages
function countCategorizedItemsWithPercentages(products) {
    const basicResult = countCategorizedItems(products);
    
    // Add percentage calculations
    const totalItems = basicResult.totals.totalItems;
    
    Object.keys(basicResult.categoryCounts).forEach(categoryType => {
        const categoryObj = basicResult.categoryCounts[categoryType];
        Object.keys(categoryObj).forEach(categoryValue => {
            const count = categoryObj[categoryValue];
            categoryObj[categoryValue] = {
                count: count,
                percentage: totalItems > 0 ? ((count / totalItems) * 100).toFixed(2) + '%' : '0%'
            };
        });
    });
    
    return basicResult;
}


export { countCategorizedItems, countCategorizedItemsWithPercentages};