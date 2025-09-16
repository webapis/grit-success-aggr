function categorizer({ product, category, includesAll, includesAllExact = false, includesOr, excludes, keyword }) {
    // Create a copy of the product to avoid mutating the original
    const result = { ...product };
    
    // Initialize categories object if it doesn't exist
    if (!result.categories) {
        result.categories = {};
    }
    
    // Get the product title in lowercase for case-insensitive matching
    const titleLower = product.title.toLowerCase();
    
    // Helper function for exact word matching with Turkish support
    const isExactWordMatch = (text, word) => {
        // Define Turkish word characters (including Turkish-specific characters)
        const turkishWordChars = 'a-zA-ZçÇğĞıİöÖşŞüÜ0-9_';
        const regex = new RegExp(`(?<![${turkishWordChars}])${word.toLowerCase()}(?![${turkishWordChars}])`, 'i');
        return regex.test(text);
    };
    
    let conditionMet = false;
    let allConditionMet = true;
    let orConditionMet = false;
    let excludeConditionMet = true; // Start with true, will be set to false if any exclude word is found
    
    // Check if all required words are present in the title (AND logic)
    if (includesAll && includesAll.length > 0) {
        if (includesAllExact) {
            // Exact word matching with Turkish character support
            allConditionMet = includesAll.every(word => {
                return isExactWordMatch(titleLower, word);
            });
        } else {
            // Partial matching (contains) - also improved for Turkish
            allConditionMet = includesAll.every(word => 
                titleLower.includes(word.toLowerCase())
            );
        }
    }
    
    // Check if any of the words are present in the title (OR logic)
    if (includesOr && includesOr.length > 0) {
        orConditionMet = includesOr.some(word => 
            titleLower.includes(word.toLowerCase())
        );
    } else if (!includesOr) {
        orConditionMet = true; // If no OR condition specified, consider it satisfied
    }
    
    // Check if any of the excluded words are present in the title
    if (excludes && excludes.length > 0) {
        excludeConditionMet = !excludes.some(word => 
            titleLower.includes(word.toLowerCase())
        );
    }
    
    // All conditions must be satisfied
    conditionMet = allConditionMet && orConditionMet && excludeConditionMet;
    
    // If conditions are met, add the keyword to the category
    if (conditionMet) {
        if (!result.categories[category]) {
            result.categories[category] = [];
        }
        
        // Add the keyword if it's not already present
        if (!result.categories[category].includes(keyword)) {
            result.categories[category].push(keyword);
        }
        
        // Remove "none" if it exists and we're adding a real category
        const noneIndex = result.categories[category].indexOf('none');
        if (noneIndex > -1) {
            result.categories[category].splice(noneIndex, 1);
        }
        
    } else {
        // If the category is 'productType' and conditions are not met, set to 'none'
        if (category === 'productType') {
            if (!result.categories[category]) {
                result.categories[category] = [];
            }
            // Only add 'none' if the array is empty
            if (result.categories[category].length === 0) {
                result.categories[category].push('none');
            }
        }
    }
    
    return result;
}

function categorizeProducts(items, categoryRules, withStats = true) {
    return items.map(item => {
        let categorizedItem = item;
        
        // Apply each categorization rule sequentially
        categoryRules.forEach(rule => {
            const originalProduct = withStats ? { ...categorizedItem } : null;
            
            categorizedItem = categorizer({
                product: categorizedItem,
                category: rule.category || 'productType',
                includesAll: rule.includesAll,
                includesAllExact: rule.includesAllExact,
                includesOr: rule.includesOr,
                excludes: rule.excludes, // Added excludes parameter
                keyword: rule.keyword
            });
            
            // Generate stats if requested
        });
        
        return categorizedItem;
    });
}

// Example usage with the rule you provided:
const exampleRule = {
    includesAll: ['deri'],
    excludes: ['suni', 'sahte', 'yapay'],
    includesOr: ['çanta', 'çantası'],
    keyword: 'deri çanta'
};

// Test products
const testProducts = [
    { title: "Hakiki deri kadın çantası" }, // Should match
    { title: "Suni deri çanta modelleri" }, // Should NOT match (excluded)
    { title: "Deri ayakkabı" }, // Should NOT match (no çanta/çantası)
    { title: "Yapay deri çantası" }, // Should NOT match (excluded)
    { title: "Gerçek deri çantası premium" } // Should match
];

console.log("Test results:");
testProducts.forEach((product, index) => {
    const result = categorizer({
        product,
        category: 'productType',
        includesAll: exampleRule.includesAll,
        excludes: exampleRule.excludes,
        includesOr: exampleRule.includesOr,
        keyword: exampleRule.keyword
    });
    console.log(`${index + 1}. "${product.title}" -> Categories:`, result.categories);
});

export { categorizer, categorizeProducts };
