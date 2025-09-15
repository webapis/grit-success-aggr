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

function categorizeProducts(items, categoryRules) {
    return items.map(item => {
        let categorizedItem = { ...item };
        let matched = false;

        categoryRules.forEach(rule => {
            const before = JSON.stringify(categorizedItem.categories);
            categorizedItem = categorizer({
                product: categorizedItem,
                category: rule.category || 'productType',
                includesAll: rule.includesAll,
                includesAllExact: rule.includesAllExact,
                includesOr: rule.includesOr,
                keyword: rule.keyword
            });
            const after = JSON.stringify(categorizedItem.categories);
            if (before !== after) matched = true;
        });

        // Update stats once per product
        categorizer.stats.total++;
        if (matched) {
            categorizer.stats.categorized++;
        } else {
            categorizer.stats.notCategorized++;
            categorizer.stats.notCategorizedProducts.push(item.title); // 👈 track uncategorized
        }

        return categorizedItem;
    });
}

// Method to get statistics
categorizer.getStats = function() {
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

    return stats;
};

// Method to reset statistics
categorizer.resetStats = function() {
    categorizer.stats = {
        total: 0,
        categorized: 0,
        notCategorized: 0,
        categories: {},
        notCategorizedProducts: []
    };
    console.log('📊 Statistics reset');
};


export { categorizer,categorizeProducts };