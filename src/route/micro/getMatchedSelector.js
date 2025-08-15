export default async function getMatchedSelector({ page, productItemSelector }) {
     const matchedSelectors = [];
        const elementCounts = {};

        for (const selector of productItemSelector) {
            const count = await page.$$eval(selector, elements => elements.length);
            if (count > 0) {
                matchedSelectors.push(selector);
                elementCounts[selector] = count;
            }
        }
    return { matchedSelectors, elementCounts };
}