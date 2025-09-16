function analyzeProductTitles(products, options = {}) {
    const {
        minWordLength = 2,           // Minimum word length to include
        caseSensitive = false,       // Case sensitive word matching
        includeStopWords = false,    // Include common stop words
        sortBy = 'frequency'         // Sort by: 'frequency', 'alphabetical', 'length'
    } = options;

    // Turkish stop words (common words that might not be useful as suggestions)
    const turkishStopWords = new Set([
        'bir', 'bu', 've', 'ile', 'için', 'de', 'da', 'den', 'dan', 'te', 'ta',
        'le', 'la', 'ki', 'olan', 'olan', 'her', 'çok', 'en', 'az', 'ya', 'yada',
        'veya', 'ancak', 'fakat', 'ama', 'lakin', 'şu', 'o', 'onun', 'bunun'
    ]);

    const result = {
        wordCounts: {},
        suggestions: [],
        stats: {
            totalProducts: products.length,
            totalUniqueWords: 0,
            totalWords: 0,
            averageWordsPerTitle: 0
        }
    };

    let totalWordCount = 0;

    products.forEach(product => {
        if (!product.title || typeof product.title !== 'string') {
            return;
        }

        // Clean and split the title into words
        const words = product.title
            .toLowerCase() // Convert to lowercase for processing
            .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Remove punctuation, keep letters, numbers, and spaces
            .split(/\s+/) // Split by whitespace
            .filter(word => {
                // Filter out empty strings and words below minimum length
                if (!word || word.length < minWordLength) return false;
                
                // Filter out stop words if requested
                if (!includeStopWords && turkishStopWords.has(word.toLowerCase())) return false;
                
                return true;
            })
            .map(word => caseSensitive ? word : word.toLowerCase());

        // Count word occurrences
        words.forEach(word => {
            result.wordCounts[word] = (result.wordCounts[word] || 0) + 1;
            totalWordCount++;
        });
    });

    // Collect all category values for checking if words exist in categories
    const allCategoryValues = new Set();
    products.forEach(product => {
        if (product.categories && typeof product.categories === 'object') {
            Object.values(product.categories).forEach(categoryArray => {
                if (Array.isArray(categoryArray)) {
                    categoryArray.forEach(value => {
                        if (value && typeof value === 'string') {
                            // Add the full category value
                            allCategoryValues.add(value.toLowerCase().trim());
                            // Also add individual words from multi-word categories
                            value.toLowerCase().trim().split(/\s+/).forEach(word => {
                                if (word.length >= minWordLength) {
                                    allCategoryValues.add(word);
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    // Create suggestions array from word counts
    result.suggestions = Object.entries(result.wordCounts).map(([word, count]) => ({
        word: word,
        count: count,
        frequency: ((count / products.length) * 100).toFixed(2) + '%',
        exists: allCategoryValues.has(word.toLowerCase())
    }));

    // Sort suggestions based on sortBy option
    switch (sortBy) {
        case 'alphabetical':
            result.suggestions.sort((a, b) => a.word.localeCompare(b.word, 'tr'));
            break;
        case 'length':
            result.suggestions.sort((a, b) => b.word.length - a.word.length || b.count - a.count);
            break;
        case 'frequency':
        default:
            result.suggestions.sort((a, b) => b.count - a.count);
            break;
    }

    // Calculate statistics
    result.stats.totalUniqueWords = Object.keys(result.wordCounts).length;
    result.stats.totalWords = totalWordCount;
    result.stats.averageWordsPerTitle = products.length > 0 
        ? (totalWordCount / products.length).toFixed(2) 
        : 0;

    return result;
}

// Enhanced version with category-aware suggestions
function analyzeProductTitlesWithCategories(products, options = {}) {
    const basicAnalysis = analyzeProductTitles(products, options);
    
    // Group words by categories they appear with
    const categoryWordMap = {};
    
    products.forEach(product => {
        if (!product.title || !product.categories) return;
        
        const words = product.title
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter(word => word.length >= (options.minWordLength || 2));
            
        // For each category type
        Object.entries(product.categories).forEach(([categoryType, categoryValues]) => {
            if (!Array.isArray(categoryValues)) return;
            
            categoryValues.forEach(categoryValue => {
                if (!categoryWordMap[categoryType]) {
                    categoryWordMap[categoryType] = {};
                }
                if (!categoryWordMap[categoryType][categoryValue]) {
                    categoryWordMap[categoryType][categoryValue] = new Set();
                }
                
                words.forEach(word => {
                    categoryWordMap[categoryType][categoryValue].add(word);
                });
            });
        });
    });
    
    // Convert sets to arrays with counts
    const categorySuggestions = {};
    Object.entries(categoryWordMap).forEach(([categoryType, categories]) => {
        categorySuggestions[categoryType] = {};
        Object.entries(categories).forEach(([categoryValue, wordsSet]) => {
            categorySuggestions[categoryType][categoryValue] = Array.from(wordsSet)
                .map(word => ({
                    word,
                    count: basicAnalysis.wordCounts[word] || 0
                }))
                .sort((a, b) => b.count - a.count);
        });
    });
    
    return {
        ...basicAnalysis,
        categorySuggestions
    };
}

// Example usage with your data:
const products = [
    {
        "title": "Kadın Siyah Deri Omuz Çantası",
        "img": [
            "https://akn-desa.a-cdn.akinoncloud.com/cms/2022/05/09/daa0baf0-4ff9-4a6c-b4ec-ac6c54e4b573.png",
            "https://akn-desa.a-cdn.akinoncloud.com/products/2025/03/27/280546/55426b1c-cff0-4a2f-99ba-c48669dc699e_size917x917_cropCenter.jpg"
        ],
        "primaryImg": "https://akn-desa.a-cdn.akinoncloud.com/cms/2022/05/09/daa0baf0-4ff9-4a6c-b4ec-ac6c54e4b573.png",
        "link": "https://www.desa.com.tr/siyah-kadin-siyah-deri-omuz-cantasi-1010039461/",
        "price": [
            {
                "value": "9490 TL",
                "selector": ".product-price-content .product-sale-price",
                "attribute": "textContent",
                "isJavaScript": false,
                "isShadowDOM": false,
                "numericValue": 9490,
                "unsetPrice": false
            }
        ],
        "videos": [],
        "productNotInStock": false,
        "matchedInfo": {
            "linkSource": "titleElement (matched: .product-item-info  p.product-name a)",
            "matchedSelector": ".product-item-box",
            "titleSelectorMatched": ".product-item-info  p.product-name a",
            "imgSelectorMatched": ".ls-is-cached.lazyloaded",
            "videoSelectorMatched": null,
            "bestPriceSelector": ".product-price-content .product-sale-price",
            "priceExtractedFromShadowDOM": false
        },
        "pageTitle": "Kadin Deri Çanta Modelleri ve Fiyatları | DESA",
        "pageURL": "https://www.desa.com.tr/kadin-canta/",
        "timestamp": "2025-09-15T12:13:46.509Z",
        "imgValid": true,
        "linkValid": true,
        "titleValid": true,
        "pageTitleValid": true,
        "priceValid": true,
        "videoValid": false,
        "mediaType": "image",
        "processId": "mfl35f6zmcc7h",
        "index": 0,
        "categories": {
            "productType": [
                "omuz çantası",
                "deri çanta"
            ],
            "color": [
                "siyah"
            ]
        }
    }
];

// Test the basic function
console.log("=== Basic Title Analysis ===");
const analysis = analyzeProductTitles(products, {
    minWordLength: 2,
    sortBy: 'frequency'
});

console.log("Word counts:", analysis.wordCounts);
console.log("Top suggestions:", analysis.suggestions);
console.log("Statistics:", analysis.stats);

// Test filtering by categorization status
console.log("\n=== Suggestions by Status ===");
const existingWords = getSuggestionsByStatus(analysis, true);
const newWords = getSuggestionsByStatus(analysis, false);
console.log("Words already in categories:", existingWords);
console.log("New word suggestions:", newWords);

// Test word usage details
console.log("\n=== Word Usage Details ===");
const wordUsage = getWordCategoryUsage(products, "siyah");
console.log("Usage for 'siyah':", wordUsage);

// Test the enhanced function with categories
console.log("\n=== Enhanced Analysis with Categories ===");
const enhancedAnalysis = analyzeProductTitlesWithCategories(products);
console.log("Category suggestions:", enhancedAnalysis.categorySuggestions);

// Helper function to filter suggestions by minimum frequency
function filterByMinimumCount(analysisResult, minCount = 2) {
    return {
        ...analysisResult,
        suggestions: analysisResult.suggestions.filter(suggestion => suggestion.count >= minCount)
    };
}

// Helper function to get suggestions by categorization status
function getSuggestionsByStatus(analysisResult, existsInCategories = null) {
    if (existsInCategories === null) {
        return analysisResult.suggestions;
    }
    return analysisResult.suggestions.filter(suggestion => 
        suggestion.exists === existsInCategories
    );
}

// Helper function to get category usage details for a specific word
function getWordCategoryUsage(products, targetWord) {
    const usage = {
        word: targetWord,
        existsInCategories: false,
        foundInCategories: {},
        titlesContainingWord: []
    };
    
    products.forEach((product, index) => {
        // Check if word exists in title
        if (product.title && product.title.toLowerCase().includes(targetWord.toLowerCase())) {
            usage.titlesContainingWord.push({
                index,
                title: product.title
            });
        }
        
        // Check if word exists in categories
        if (product.categories) {
            Object.entries(product.categories).forEach(([categoryType, categoryValues]) => {
                if (Array.isArray(categoryValues)) {
                    categoryValues.forEach(categoryValue => {
                        if (categoryValue && categoryValue.toLowerCase().includes(targetWord.toLowerCase())) {
                            usage.existsInCategories = true;
                            if (!usage.foundInCategories[categoryType]) {
                                usage.foundInCategories[categoryType] = [];
                            }
                            if (!usage.foundInCategories[categoryType].includes(categoryValue)) {
                                usage.foundInCategories[categoryType].push(categoryValue);
                            }
                        }
                    });
                }
            });
        }
    });
    
    return usage;
}
export {analyzeProductTitles, analyzeProductTitlesWithCategories, filterByMinimumCount, getSuggestionsByStatus, getWordCategoryUsage};