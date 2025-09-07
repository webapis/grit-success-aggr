export default async function getMatchedSelector({ page, selector }) {
    // ✅ Add this validation
    if (!selector) {
        throw new Error('selector is required');
    }
    
    if (!Array.isArray(selector)) {
        throw new Error('selector must be an array');
    }
    
    const matchedSelectors = [];
    const elementCounts = {};

    for (const currentSelector of selector) { // Now safe
        const count = await page.$$eval(currentSelector, elements => elements.length);
        if (count > 0) {
            matchedSelectors.push(currentSelector);
            elementCounts[currentSelector] = count;
        }
    }
    return { matchedSelectors, elementCounts };
}