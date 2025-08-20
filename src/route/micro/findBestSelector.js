//https://claude.ai/chat/c19ca193-9b21-4ea2-85ab-fc3b9f7ff7b6
export default async function findBestSelector(page, selectors) {
    console.log('productItemSelector____________________________________________________', selectors);
    
    const result = await page.evaluate((selectors) => {
        // Calculate specificity score for a CSS selector
        function calculateSpecificity(selector) {
            let score = 0;
            
            // Count IDs (#id, [id*=], [id^=], etc.)
            const idMatches = selector.match(/#[\w-]+|\[id[\*\^$~|]?=/g);
            score += (idMatches || []).length * 100;
            
            // Count classes (.class), attributes ([attr]), and pseudo-classes (:pseudo)
            const classMatches = selector.match(/\.[\w-]+|\[[\w-]+[\*\^$~|]?=|\:[\w-]+(?:\([^)]*\))?/g);
            score += (classMatches || []).length * 10;
            
            // Count elements (div, span, article, etc.)
            const elementMatches = selector.match(/(?:^|[\s>+~])([a-zA-Z][\w-]*)/g);
            score += (elementMatches || []).length * 1;
            
            // Bonus for descendant combinators (spaces) - indicates more specific targeting
            const descendantMatches = selector.match(/\s+(?![>+~])/g);
            score += (descendantMatches || []).length * 5;
            
            // Bonus for direct child combinators (>)
            const childMatches = selector.match(/>/g);
            score += (childMatches || []).length * 3;
            
            // Bonus for negation selectors (:not()) - they're more specific
            const notMatches = selector.match(/:not\([^)]+\)/g);
            score += (notMatches || []).length * 8;
            
            // Bonus for :has() selectors - they're very specific
            const hasMatches = selector.match(/:has\([^)]+\)/g);
            score += (hasMatches || []).length * 12;
            
            // Length bonus - longer selectors are generally more specific
            score += Math.floor(selector.length / 10);
            
            return score;
        }
        
        // Find selectors that actually match elements on the page
        const validSelectors = selectors
            .map(selector => {
                try {
                    const count = document.querySelectorAll(selector).length;
                    const specificity = calculateSpecificity(selector);
                    
                    return {
                        selector,
                        count,
                        specificity,
                        // Combined score: prioritize specificity, but still consider match count
                        combinedScore: count > 0 ? (specificity * 1000) + count : 0
                    };
                } catch (error) {
                    console.warn(`Invalid selector: ${selector}`, error);
                    return {
                        selector,
                        count: 0,
                        specificity: 0,
                        combinedScore: 0
                    };
                }
            })
            .filter(item => item.count > 0); // Only keep selectors that match something
        
        if (validSelectors.length === 0) {
            return {
                bestSelector: { selector: selectors[0], count: 0, specificity: 0 },
                selectorCounts: [],
                selector: selectors[0],
                count: 0,
                error: 'No valid selectors found'
            };
        }
        
        // Sort by combined score (specificity weighted heavily, then by count)
        validSelectors.sort((a, b) => b.combinedScore - a.combinedScore);
        
        const bestSelector = validSelectors[0];
        
        console.log('Selector analysis:', validSelectors.map(s => ({
            selector: s.selector,
            count: s.count,
            specificity: s.specificity,
            score: s.combinedScore
        })));
        console.log('Using best selector:', bestSelector.selector, 
                   'with', bestSelector.count, 'matches',
                   'and specificity score:', bestSelector.specificity);
        
        return {
            bestSelector,
            selectorCounts: validSelectors,
            selector: bestSelector.selector,
            count: bestSelector.count,
            specificity: bestSelector.specificity
        };
    }, selectors);
    
    return result;
}

// Example usage and explanation:
/*
Given these selectors:
- ".pitem" (specificity: 10, matches: 50)
- ".product-list .pitem" (specificity: 25, matches: 30)

The function will choose ".product-list .pitem" because:
- It has higher specificity (25 vs 10)
- Even though it has fewer matches, the specificity weight makes it win
- Combined scores: ".pitem" = 10*1000 + 50 = 10,050
                  ".product-list .pitem" = 25*1000 + 30 = 25,030

Specificity calculation includes:
- IDs: 100 points each
- Classes/attributes/pseudo-classes: 10 points each
- Elements: 1 point each  
- Descendant combinators: 5 points each
- Child combinators: 3 points each
- :not() selectors: 8 points each
- :has() selectors: 12 points each
- Length bonus: 1 point per 10 characters
*/