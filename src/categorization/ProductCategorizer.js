class KeywordCategorizer {
    constructor(categoryDefinitions) {
        this.categories = categoryDefinitions;
        this.compiledPatterns = this.compilePatterns();
    }

    // Compile keywords into regex patterns for better performance
    compilePatterns() {
        const compiled = {};

        Object.keys(this.categories).forEach(categoryType => {
            compiled[categoryType] = {};

            Object.keys(this.categories[categoryType]).forEach(categoryName => {
                const keywords = this.categories[categoryType][categoryName];
                // Create regex pattern that matches any of the keywords
                const pattern = keywords.map(keyword =>
                    keyword.replace(/[.*+?^${}()|[\\]/g, '\\$&') // Escape special regex chars
                ).join('|');

                compiled[categoryType][categoryName] = new RegExp(`\\b(${pattern})\\b`, 'gi');
            });
        });

        return compiled;
    }

    // Main categorization function
    categorize(products) {
        return products.map(product => this.categorizeProduct(product));
    }

    // Categorize single product based on title keywords
    categorizeProduct(product) {
        const title = (product.title || '').toLowerCase().trim();
        const detectedCategories = {};

        // Check each category type
        Object.keys(this.categories).forEach(categoryType => {
            const matches = [];

            // Check each category within the type
            Object.keys(this.categories[categoryType]).forEach(categoryName => {
                const pattern = this.compiledPatterns[categoryType][categoryName];
                const matchResult = title.match(pattern);

                if (matchResult) {
                    matches.push(categoryName);
                }
            });

            if (matches.length > 0) {
                detectedCategories[categoryType] = [...new Set(matches)]; // Remove duplicates
            }
        });

        return {
            ...product,
            categories: detectedCategories,
            categorization_score: this.calculateScore(detectedCategories)
        };
    }

    // Calculate categorization confidence score
    calculateScore(categories) {
        const totalPossibleCategories = Object.keys(this.categories).length;
        const foundCategories = Object.keys(categories).length;
        return Math.round((foundCategories / totalPossibleCategories) * 100);
    }

    // Query products by specific category criteria
    queryByCategory(categorizedProducts, queryParams) {
        return categorizedProducts.filter(product => {
            return Object.entries(queryParams).every(([categoryType, criteria]) => {
                const productCategories = product.categories[categoryType] || [];

                if (Array.isArray(criteria)) {
                    // Match any of the criteria (OR logic)
                    return criteria.some(criterion => productCategories.includes(criterion));
                } else if (typeof criteria === 'string') {
                    // Exact match
                    return productCategories.includes(criteria);
                } else if (criteria.contains) {
                    // Contains any of the specified values
                    const containsValues = Array.isArray(criteria.contains) ? criteria.contains : [criteria.contains];
                    return containsValues.some(value => productCategories.includes(value));
                } else if (criteria.any) {
                    // Has any category in this type
                    return productCategories.length > 0;
                } else if (criteria.none) {
                    // Has no categories in this type
                    return productCategories.length === 0;
                }

                return false;
            });
        });
    }

    // Get category statistics
    getCategoryStats(categorizedProducts) {
        const stats = {};

        Object.keys(this.categories).forEach(categoryType => {
            stats[categoryType] = {};

            // Count products per category
            Object.keys(this.categories[categoryType]).forEach(categoryName => {
                stats[categoryType][categoryName] = categorizedProducts.filter(product =>
                    (product.categories[categoryType] || []).includes(categoryName)
                ).length;
            });
        });

        return stats;
    }

    // Find products missing specific category types
    findUncategorized(categorizedProducts, requiredCategoryTypes = []) {
        const typesToCheck = requiredCategoryTypes.length > 0 ?
            requiredCategoryTypes : Object.keys(this.categories);

        return categorizedProducts.filter(product => {
            return typesToCheck.some(categoryType =>
                !product.categories[categoryType] || product.categories[categoryType].length === 0
            );
        });
    }

    // Add new keywords to existing categories
    addKeywords(categoryType, categoryName, newKeywords) {
        if (!this.categories[categoryType]) {
            this.categories[categoryType] = {};
        }

        if (!this.categories[categoryType][categoryName]) {
            this.categories[categoryType][categoryName] = [];
        }

        // Add new keywords and remove duplicates
        this.categories[categoryType][categoryName] = [
            ...new Set([...this.categories[categoryType][categoryName], ...newKeywords])
        ];

        // Recompile patterns
        this.compiledPatterns = this.compilePatterns();
    }

    // Suggest keywords based on uncategorized products
    suggestKeywords(uncategorizedProducts, categoryType) {
        const wordFrequency = {};

        uncategorizedProducts.forEach(product => {
            const title = (product.title || '').toLowerCase();
            const words = title.match(/[\wçğıöşü]+/g) || [];

            words.forEach(word => {
                if (word.length > 2) { // Skip very short words
                    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
                }
            });
        });

        // Sort by frequency and return top suggestions
        return Object.entries(wordFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([word, count]) => ({ word, frequency: count }));
    }
}

// Predefined category definitions optimized for Turkish e-commerce
const DefaultCategories = {
    gender: {
        'kadın': ['kadın', 'bayan', 'women', 'woman', 'lady'],
        'erkek': ['erkek', 'bay', 'men', 'man', 'male'],
        'çocuk': ['çocuk', 'bebek', 'kids', 'child', 'baby'],
        'unisex': ['unisex', 'her iki cinsiyet']
    },

    productType: {
        'çanta': ['çanta', 'bag', 'torba'],
        'omuz çantası': ['omuz çantası', 'shoulder bag', 'omuz'],
        'el çantası': ['el çantası', 'hand bag', 'clutch'],
        'sırt çantası': ['sırt çantası', 'backpack', 'sırt'],
        'cüzdan': ['cüzdan', 'wallet'],
        'ayakkabı': ['ayakkabı', 'shoes', 'bot', 'sandalet'],
        'elbise': ['elbise', 'dress'],
        'bluz': ['bluz', 'blouse', 'gömlek'],
        'pantolon': ['pantolon', 'pants', 'trousers'],
        'ceket': ['ceket', 'jacket', 'mont'],
        'tişört': ['tişört', 't-shirt', 'tshirt'],
        'etek': ['etek', 'skirt']
    },

    color: {
        'pembe': ['pembe', 'pink', 'rosa'],
        'mavi': ['mavi', 'blue', 'lacivert', 'navy'],
        'kırmızı': ['kırmızı', 'red', 'al'],
        'yeşil': ['yeşil', 'green'],
        'sarı': ['sarı', 'yellow'],
        'siyah': ['siyah', 'black', 'kara'],
        'beyaz': ['beyaz', 'white', 'ak'],
        'gri': ['gri', 'gray', 'grey'],
        'kahverengi': ['kahverengi', 'brown', 'kahve'],
        'mor': ['mor', 'purple', 'menekşe']
    },

    size: {
        'küçük': ['küçük', 'small', 'mini', 'xs', 's'],
        'orta': ['orta', 'medium', 'orta boy', 'm'],
        'büyük': ['büyük', 'large', 'big', 'l'],
        'extra büyük': ['extra büyük', 'extra large', 'xl', 'xxl']
    },

    style: {
        'dokulu': ['dokulu', 'textured', 'texture'],
        'düz': ['düz', 'plain', 'solid'],
        'desenli': ['desenli', 'patterned', 'pattern'],
        'çizgili': ['çizgili', 'striped', 'stripe'],
        'vintage': ['vintage', 'retro', 'klassik']
    },

    material: {
        'deri': ['deri', 'leather'],
        'kumaş': ['kumaş', 'fabric', 'textile'],
        'pamuk': ['pamuk', 'cotton'],
        'jean': ['jean', 'denim']
    }
};

// Helper functions for common queries
const CategoryQueries = {
    // Find women's products
    womenProducts: () => ({ gender: 'kadın' }),

    // Find products by color
    byColor: (colors) => ({ color: Array.isArray(colors) ? colors : [colors] }),

    // Find bags
    bags: () => ({ productType: { contains: ['çanta', 'omuz çantası', 'el çantası', 'sırt çantası'] } }),

    // Find specific product type
    byProductType: (type) => ({ productType: type }),

    // Find products with specific style
    byStyle: (style) => ({ style: style }),

    // Find products missing categories
    missingCategories: (categoryTypes) => {
        const query = {};
        categoryTypes.forEach(type => {
            query[type] = { none: true };
        });
        return query;
    }
};

export {
    KeywordCategorizer,
    DefaultCategories,
    CategoryQueries
}