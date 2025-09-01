// Function to extract CSS selector information from JavaScript objects
export default function extractCSSSelectors(dataArray) {
    const selectorInfo = {
        uniqueSelectors: new Set(),
        selectorUsage: {},
        summary: {
            totalObjects: dataArray.length,
            selectorsFound: 0,
            mostCommonSelectors: []
        }
    };

    // Extract selectors from each object
    dataArray.forEach((obj, index) => {
        if (obj.matchedInfo) {
            const matchedInfo = obj.matchedInfo;
            
            // Collect all selectors from matchedInfo
            const selectors = [
                matchedInfo.matchedSelector,
                matchedInfo.titleSelectorMatched,
                matchedInfo.imgSelectorMatched,
                matchedInfo.videoSelectorMatched,
                matchedInfo.bestPriceSelector
            ].filter(selector => selector !== null && selector !== undefined);

            // Add to unique selectors and count usage
            selectors.forEach(selector => {
                selectorInfo.uniqueSelectors.add(selector);
                
                if (!selectorInfo.selectorUsage[selector]) {
                    selectorInfo.selectorUsage[selector] = {
                        count: 0,
                        usedFor: new Set(),
                        objectIndices: []
                    };
                }
                
                selectorInfo.selectorUsage[selector].count++;
                selectorInfo.selectorUsage[selector].objectIndices.push(index);
                
                // Determine what this selector was used for
                if (selector === matchedInfo.matchedSelector) {
                    selectorInfo.selectorUsage[selector].usedFor.add('main element');
                }
                if (selector === matchedInfo.titleSelectorMatched) {
                    selectorInfo.selectorUsage[selector].usedFor.add('title');
                }
                if (selector === matchedInfo.imgSelectorMatched) {
                    selectorInfo.selectorUsage[selector].usedFor.add('image');
                }
                if (selector === matchedInfo.videoSelectorMatched) {
                    selectorInfo.selectorUsage[selector].usedFor.add('video');
                }
                if (selector === matchedInfo.bestPriceSelector) {
                    selectorInfo.selectorUsage[selector].usedFor.add('price');
                }
            });
        }
    });

    // Convert Set to Array for summary
    selectorInfo.summary.selectorsFound = selectorInfo.uniqueSelectors.size;
    
    // Find most common selectors
    const sortedSelectors = Object.entries(selectorInfo.selectorUsage)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);
    
    selectorInfo.summary.mostCommonSelectors = sortedSelectors.map(([selector, info]) => ({
        selector,
        count: info.count,
        usedFor: Array.from(info.usedFor)
    }));

    return selectorInfo;
}

// Function to display the results in a readable format
function displaySelectorInfo(selectorInfo) {
    console.log("=== CSS Selector Analysis ===\n");
    
    console.log(`Total objects analyzed: ${selectorInfo.summary.totalObjects}`);
    console.log(`Unique selectors found: ${selectorInfo.summary.selectorsFound}\n`);
    
    console.log("=== All Unique Selectors ===");
    Array.from(selectorInfo.uniqueSelectors).forEach(selector => {
        console.log(`• ${selector}`);
    });
    
    console.log("\n=== Selector Usage Details ===");
    Object.entries(selectorInfo.selectorUsage).forEach(([selector, info]) => {
        console.log(`\nSelector: ${selector}`);
        console.log(`  Used ${info.count} time(s)`);
        console.log(`  Purpose: ${Array.from(info.usedFor).join(', ')}`);
        console.log(`  Found in objects: ${info.objectIndices.join(', ')}`);
    });
    
    console.log("\n=== Most Common Selectors ===");
    selectorInfo.summary.mostCommonSelectors.forEach((item, index) => {
        console.log(`${index + 1}. ${item.selector} (${item.count} times) - ${item.usedFor.join(', ')}`);
    });
}

// // Example usage with your data
// const yourData = [
//     {
//         "title": "Classy El ve Omuz Çantası Acı Kahve",
//         "matchedInfo": {
//             "linkSource": "titleElement (matched: a[title]:not([href='javascript:void(0);']):not([href='#']):not([href='']))",
//             "matchedSelector": ".showcase",
//             "titleSelectorMatched": "a[title]:not([href='javascript:void(0);']):not([href='#']):not([href=''])",
//             "imgSelectorMatched": ".showcase-image img",
//             "videoSelectorMatched": null,
//             "bestPriceSelector": ".showcase-price-new",
//             "priceExtractedFromShadowDOM": false
//         }
//     },
//     {
//         "title": "Classy El ve Omuz Çantası Beyaz",
//         "matchedInfo": {
//             "linkSource": "titleElement (matched: a[title]:not([href='javascript:void(0);']):not([href='#']):not([href='']))",
//             "matchedSelector": ".showcase",
//             "titleSelectorMatched": "a[title]:not([href='javascript:void(0);']):not([href='#']):not([href=''])",
//             "imgSelectorMatched": ".showcase-image img",
//             "videoSelectorMatched": null,
//             "bestPriceSelector": ".showcase-price-new",
//             "priceExtractedFromShadowDOM": false
//         }
//     }
// ];

// // Run the analysis
// const result = extractCSSSelectors(yourData);
// displaySelectorInfo(result);

// // You can also access specific information:
// console.log("\n=== Quick Access Examples ===");
// console.log("All unique selectors:", Array.from(result.uniqueSelectors));
// console.log("Selector usage count:", result.selectorUsage);