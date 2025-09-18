function categorizer({ product, category, includesAll, includesAllExact = false, includesOr, includesOrExact = false, includesOrConditions, includesOrConditionsExact = false, excludes, keyword }) {
    // Create a copy of the product to avoid mutating the original
    const result = { ...product };
    
    // Initialize categories object if it doesn't exist
    if (!result.categories) {
        result.categories = {};
    }
    
    // Handle cases where product title might be null or not a string
    if (typeof product.title !== 'string' || !product.title) {
        // If the category is 'productType', ensure it's set to 'none' if no other category has been assigned
        if (category === 'productType') {
            if (!result.categories[category] || result.categories[category].length === 0) {
                result.categories[category] = ['none'];
            }
        }
        return result; // Return the product without further processing
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
    let orConditionsMet = true; // New: for multiple OR condition groups
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
    
    // Check if any of the words are present in the title (OR logic) - Legacy support
    if (includesOr && includesOr.length > 0) {
        if (includesOrExact) {
            // Exact word matching for OR condition
            orConditionMet = includesOr.some(word => isExactWordMatch(titleLower, word));
        } else {
            // Partial matching (contains)
            orConditionMet = includesOr.some(word => 
                titleLower.includes(word.toLowerCase())
            );
        }
    } else if (!includesOr) {
        orConditionMet = true; // If no OR condition specified, consider it satisfied
    }
    
    // NEW: Check multiple OR condition groups (all groups must have at least one match)
    if (includesOrConditions && includesOrConditions.length > 0) {
        orConditionsMet = includesOrConditions.every(orGroup => {
            // Each OR group must have at least one matching word
            if (includesOrConditionsExact) {
                // Exact word matching for OR conditions
                return orGroup.some(word => isExactWordMatch(titleLower, word));
            } else {
                // Partial matching (contains)
                return orGroup.some(word => 
                    titleLower.includes(word.toLowerCase())
                );
            }
        });
    }
    
    // Check if any of the excluded words are present in the title
    if (excludes && excludes.length > 0) {
        excludeConditionMet = !excludes.some(word => 
            titleLower.includes(word.toLowerCase())
        );
    }
    
    // All conditions must be satisfied (including the new OR conditions)
    conditionMet = allConditionMet && orConditionMet && orConditionsMet && excludeConditionMet;
    
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
            categorizedItem = categorizer({
                product: categorizedItem,
                category: rule.category || 'productType',
                includesAll: rule.includesAll,
                includesAllExact: rule.includesAllExact,
                includesOr: rule.includesOr,
                includesOrExact: rule.includesOrExact, // NEW parameter
                includesOrConditions: rule.includesOrConditions,
                includesOrConditionsExact: rule.includesOrConditionsExact, // NEW parameter
                excludes: rule.excludes,
                keyword: rule.keyword
            });
            
            // Generate stats if requested
        });
        
        return categorizedItem;
    });
}

export { categorizer, categorizeProducts };