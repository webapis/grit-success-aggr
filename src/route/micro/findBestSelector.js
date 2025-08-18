export default async function findBestSelector(page, selectors) {
    const result = await page.evaluate((selectors) => {
        // Find which individual CSS selector has the most matches
        const selectorCounts = selectors.map(selector => ({
            selector,
            count: document.querySelectorAll(selector).length
        }));

        // Get the selector with the highest count
        const bestSelector = selectorCounts.reduce((best, current) =>
            current.count > best.count ? current : best
        );

        console.log('Selector counts:', selectorCounts);
        console.log('Using best selector:', bestSelector.selector, 'with', bestSelector.count, 'matches');

        return {
            bestSelector,
            selectorCounts,
            selector: bestSelector.selector,
            count: bestSelector.count
        };
    }, selectors);

    return result;
}