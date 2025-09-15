function categorizer({ product, category, includesAll, includesAllExact = false, includesOr, keyword }) {
    // Create a copy of the product to avoid mutating the original
    const result = { ...product };
    
    // Initialize categories object if it doesn't exist
    if (!result.categories) {
        result.categories = {};
    }
    
    // Get the product title in lowercase for case-insensitive matching
    const titleLower = product.title.toLowerCase();
    
    // Helper function to normalize Turkish characters for better matching
    const normalizeTurkish = (text) => {
        return text.toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
    };
    
    // Helper function for exact word matching with Turkish support
    const isExactWordMatch = (text, word) => {
        // Define Turkish word characters (including Turkish-specific characters)
        const turkishWordChars = 'a-zA-ZçÇğĞıİöÖşŞüÜ0-9_';
        const regex = new RegExp(`(?<![${turkishWordChars}])${word.toLowerCase()}(?![${turkishWordChars}])`, 'i');
        return regex.test(text);
    };
    
    let conditionMet = false;
    let allConditionMet = true;
    let orConditionMet = true;
    
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
    
    // Both conditions must be satisfied if both are provided
    conditionMet = allConditionMet && orConditionMet;
    
    // Initialize stats if not exists
    if (!categorizer.stats) {
        categorizer.stats = {
            total: 0,
            categorized: 0,
            notCategorized: 0,
            categories: {}
        };
    }
    
    // Update total count
    categorizer.stats.total++;
    
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
        
        // Update stats for categorized items
        categorizer.stats.categorized++;
        if (!categorizer.stats.categories[category]) {
            categorizer.stats.categories[category] = {};
        }
        if (!categorizer.stats.categories[category][keyword]) {
            categorizer.stats.categories[category][keyword] = 0;
        }
        categorizer.stats.categories[category][keyword]++;
        
        console.log(`✅ Categorized: "${product.title}" → ${category}: ${keyword}`);
        
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
        
        // Update stats for not categorized items
        categorizer.stats.notCategorized++;
        console.log(`❌ Not categorized: "${product.title}" (${category}: ${includesAll ? 'includesAll: ' + includesAll.join(', ') : ''}${includesOr ? 'includesOr: ' + includesOr.join(', ') : ''})`);
    }
    
    return result;
}

// Method to get statistics
categorizer.getStats = function() {
    if (!categorizer.stats) {
        return { message: "No categorization has been performed yet." };
    }
    
    const stats = { ...categorizer.stats };
    stats.categorizationRate = ((stats.categorized / stats.total) * 100).toFixed(2) + '%';
    
    console.log('\n📊 CATEGORIZATION STATISTICS:');
    console.log(`Total products processed: ${stats.total}`);
    console.log(`Successfully categorized: ${stats.categorized} (${stats.categorizationRate})`);
    console.log(`Not categorized: ${stats.notCategorized}`);
    console.log('\nCategory breakdown:', stats.categories);
    
    return stats;
};

// Method to reset statistics
categorizer.resetStats = function() {
    categorizer.stats = {
        total: 0,
        categorized: 0,
        notCategorized: 0,
        categories: {}
    };
    console.log('📊 Statistics reset');
};

function categorizeProducts(items, categoryRules) {
    return items.map(item => {
        let categorizedItem = item;
        
        // Apply each categorization rule sequentially
        categoryRules.forEach(rule => {
            categorizedItem = categorizer({
                product: categorizedItem,
                category: rule.category || 'productType',
                includesAll: rule.includesAll,
                includesAllExact: rule.includesAllExact,
                includesOr: rule.includesOr,
                keyword: rule.keyword
            });
        });
        
        return categorizedItem;
    });
}

export { categorizer,categorizeProducts };