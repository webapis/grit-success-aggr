function categorizer({ product, category, includesAll, includesAllExact = false, includesOr, keyword }) {
    const result = { ...product };

    if (!result.categories) {
        result.categories = {};
    }

    const titleLower = product.title.toLowerCase();

    const normalizeTurkish = (text) => {
        return text.toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
    };

    const isExactWordMatch = (text, word) => {
        const turkishWordChars = 'a-zA-ZçÇğĞıİöÖşŞüÜ0-9_';
        const regex = new RegExp(
            `(?<![${turkishWordChars}])${word.toLowerCase()}(?![${turkishWordChars}])`,
            'i'
        );
        return regex.test(text);
    };

    let allConditionMet = true;
    let orConditionMet = true;

    if (includesAll && includesAll.length > 0) {
        if (includesAllExact) {
            allConditionMet = includesAll.every(word => isExactWordMatch(titleLower, word));
        } else {
            allConditionMet = includesAll.every(word =>
                titleLower.includes(word.toLowerCase())
            );
        }
    }

    if (includesOr && includesOr.length > 0) {
        orConditionMet = includesOr.some(word =>
            titleLower.includes(word.toLowerCase())
        );
    }

    const conditionMet = allConditionMet && orConditionMet;

    // Initialize stats if not exists
    if (!categorizer.stats) {
        categorizer.stats = {
            total: 0,
            categorized: 0,
            notCategorized: 0,
            categories: {},
            notCategorizedProducts: [] // 👈 new
        };
    }

    if (conditionMet) {
        if (!result.categories[category]) {
            result.categories[category] = [];
        }
        if (!result.categories[category].includes(keyword)) {
            result.categories[category].push(keyword);
        }

        const noneIndex = result.categories[category].indexOf('none');
        if (noneIndex > -1) {
            result.categories[category].splice(noneIndex, 1);
        }

        if (!categorizer.stats.categories[category]) {
            categorizer.stats.categories[category] = {};
        }
        if (!categorizer.stats.categories[category][keyword]) {
            categorizer.stats.categories[category][keyword] = 0;
        }
        categorizer.stats.categories[category][keyword]++;

        console.log(`✅ Categorized: "${product.title}" → ${category}: ${keyword}`);
    }

    return result;
}

// --- Main categorization function ---
function categorizeProducts(products, categoryRules) {
    categorizer.stats = {
        total: products.length,
        categorized: 0,
        notCategorized: 0,
        categories: {},
        notCategorizedProducts: []
    };

    return products.map(product => {
        let matchedCategories = [];

        for (const rule of categoryRules) {
            const titleLower = product.title.toLowerCase();

            const includesAll = (rule.includesAll || []).every(k =>
                titleLower.includes(k.toLowerCase())
            );
            const includesOr =
                (rule.includesOr || []).length === 0 ||
                (rule.includesOr || []).some(k =>
                    titleLower.includes(k.toLowerCase())
                );

            if (includesAll && includesOr) {
                matchedCategories.push({
                    category: rule.category,
                    keyword: rule.keyword
                });

                if (!categorizer.stats.categories[rule.category]) {
                    categorizer.stats.categories[rule.category] = {};
                }
                if (!categorizer.stats.categories[rule.category][rule.keyword]) {
                    categorizer.stats.categories[rule.category][rule.keyword] = 0;
                }
                categorizer.stats.categories[rule.category][rule.keyword]++;
            }
        }

        if (matchedCategories.length > 0) {
            categorizer.stats.categorized++;
        } else {
            categorizer.stats.notCategorized++;
            categorizer.stats.notCategorizedProducts.push(product.title);
        }

        return {
            ...product,
            categories: matchedCategories
        };
    });
}

// --- Helper for keyword suggestions with stopword filtering ---
function generateKeywordSuggestions(products, categoryRules, minFrequency = 3) {
    const normalizeTurkish = (text) => {
        return text.toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
    };

    // 🚫 Hardcoded stopwords (shortened so we don’t over-filter)
    const stopwords = new Set([
        "kadın", "kadin",
        "erkek",
        "unisex",
        "çocuk", "cocuk",
        "moda", "giyim",
        "aksesuar"
    ]);

    // Collect all existing keywords from rules (normalized)
    const existingKeywords = new Set(
        categoryRules.flatMap(r =>
            [ ...(r.includesAll || []), ...(r.includesOr || []), r.keyword ]
        ).map(k => normalizeTurkish(k))
    );

    const freqMap = {};

    products.forEach(product => {
        const words = normalizeTurkish(product.title)
            .split(/[\s\-,./()]+/) // split on spaces & punctuation
            .filter(w => w.length > 1);

        words.forEach(word => {
            if (stopwords.has(word)) return;
            if (!freqMap[word]) freqMap[word] = 0;
            freqMap[word]++;
        });
    });

    // Convert to array with isExisting flag
    const suggestions = Object.entries(freqMap)
        .filter(([_, frequency]) => frequency >= minFrequency) // 👈 only frequent words
        .map(([word, frequency]) => ({
            word,
            frequency,
            isExisting: existingKeywords.has(word)
        }))
        .sort((a, b) => b.frequency - a.frequency);

    return suggestions;
}


// --- Stats + Suggestions ---
categorizer.getStats = function(products = [], categoryRules = []) {
    if (!categorizer.stats) {
        return { message: "No categorization has been performed yet." };
    }

    const stats = { ...categorizer.stats };
    stats.categorizationRate =
        ((stats.categorized / stats.total) * 100).toFixed(2) + '%';

    console.log('\n📊 CATEGORIZATION STATISTICS:');
    console.log(`Total products processed: ${stats.total}`);
    console.log(`Successfully categorized: ${stats.categorized} (${stats.categorizationRate})`);
    console.log(`Not categorized: ${stats.notCategorized}`);
    console.log('\nCategory breakdown:', stats.categories);

    if (stats.notCategorizedProducts.length > 0) {
        console.log('\n🚨 Products not categorized:', stats.notCategorizedProducts);
    }

    if (products.length > 0 && categoryRules.length > 0) {
        const suggestions = generateKeywordSuggestions(products, categoryRules);
        const newWords = suggestions.filter(s => !s.isExisting).slice(0, 30); // top 30
        console.log('\n💡 Suggested new keywords (stopwords removed):', newWords);
        stats.suggestions = newWords;
    }

    return stats;
};



export { categorizer,categorizeProducts };