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
        'veya', 'ancak', 'fakat', 'ama', 'lakin', 'şu', 'o', 'onun', 'bunun','defacto','DCEY'
    ]);

    const result = {
        wordCounts: {},
        wordTitleExamples: {}, // Store example titles for each word
        wordLinkExamples: {}, // Store example links for each word
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

        // Count word occurrences and store example titles and links
        words.forEach(word => {
            result.wordCounts[word] = (result.wordCounts[word] || 0) + 1;
            
            // Store the first example title and link for each word
            if (!result.wordTitleExamples[word]) {
                result.wordTitleExamples[word] = product.title;
                result.wordLinkExamples[word] = product.link || null;
            }
            
            totalWordCount++;
        });
    });

    // Collect all SEO keywords for checking if words exist
    const allCategoryValues = new Set();
    products.forEach(product => {
        if (product.seo && Array.isArray(product.seo.keywords)) {
            product.seo.keywords.forEach(keyword => {
                if (keyword && typeof keyword === 'string') {
                    // Add the full keyword
                    allCategoryValues.add(keyword.toLowerCase().trim());
                    // Also add individual words from multi-word keywords
                    keyword.toLowerCase().trim().split(/\s+/).forEach(word => {
                        if (word.length >= minWordLength) {
                            allCategoryValues.add(word);
                        }
                    });
                }
            });
        }
    });

    // Create suggestions array from word counts with example titles and links
    result.suggestions = Object.entries(result.wordCounts).map(([word, count]) => ({
        word: word,
        count: count,
        frequency: ((count / products.length) * 100).toFixed(2) + '%',
        exists: allCategoryValues.has(word.toLowerCase()),
        title: result.wordTitleExamples[word], // Add example title
        link: result.wordLinkExamples[word] // Add example link
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

// Enhanced version with category-aware suggestions (also updated to include titles)
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
    
    // Convert sets to arrays with counts and example titles
    const categorySuggestions = {};
    Object.entries(categoryWordMap).forEach(([categoryType, categories]) => {
        categorySuggestions[categoryType] = {};
        Object.entries(categories).forEach(([categoryValue, wordsSet]) => {
            categorySuggestions[categoryType][categoryValue] = Array.from(wordsSet)
                .map(word => ({
                    word,
                    count: basicAnalysis.wordCounts[word] || 0,
                    title: basicAnalysis.wordTitleExamples[word], // Include example title
                    link: basicAnalysis.wordLinkExamples[word] // Include example link
                }))
                .sort((a, b) => b.count - a.count);
        });
    });
    
    return {
        ...basicAnalysis,
        categorySuggestions
    };
}

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

// Enhanced helper function to get multiple title and link examples for a word
function getWordTitleExamples(products, targetWord, maxExamples = 3) {
    const examples = [];
    
    products.forEach((product, index) => {
        if (examples.length >= maxExamples) return;
        
        if (product.title && product.title.toLowerCase().includes(targetWord.toLowerCase())) {
            examples.push({
                index,
                title: product.title,
                link: product.link || null
            });
        }
    });
    
    return examples;
}

export {
    analyzeProductTitles, 
    analyzeProductTitlesWithCategories, 
    filterByMinimumCount, 
    getSuggestionsByStatus, 
    getWordCategoryUsage,
    getWordTitleExamples
};