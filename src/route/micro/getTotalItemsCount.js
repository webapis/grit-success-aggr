import itemCounterSelector from "../../selector-attibutes/itemCounterSelector.js";

export default async function getTotalItemsCount(page, totalProductCounterSelector) {
    debugger;
console.log('totalProductCounterSelector----------------!!', totalProductCounterSelector);
    // Prefer the selector passed into the function, otherwise use default
    const selectorToUse = totalProductCounterSelector || itemCounterSelector;
    if (totalProductCounterSelector === 'none') {

        return { count: 0, selector: 'none' };

    }
    // If you don't want to use findBestSelector anymore, just query directly:
    let selector = selectorToUse;

    // Optional: If selector is an array, pick the first one that exists on the page
    if (Array.isArray(selector)) {
        for (const s of selector) {
            const exists = await page.$(s);
            if (exists) {
                selector = s;
                break;
            }
        }
    }

    if (!selector) {
        console.warn('No valid item counter selector found on the page');
        console.warn('Available selectors were:', selectorToUse);
        return { count: 0, selector: 'No valid item counter selector found on the page' };
    }

    try {
        // Wait for element

        await page.waitForSelector(selector);

        const resultElement = await page.$eval(selector, el => el.textContent);

        if (!resultElement) {
            console.warn('Element found but has no text content');
            return { count: 0, selector: 'Element found but has no text content:' + selector };
        }

        const number = resultElement.replaceAll('(', ' ').replaceAll(')', ' ')
            .trim()
            .split(" ")
            .filter(f => Number(f));

        console.log('getTotalItemsCount', number);
        debugger;

        if (number.length === 0) {
            console.warn('No numbers found in element text:', resultElement);
            return { count: 0, selector: 'No numbers found in element text: ' + selector };
        }

        return { count: parseInt(number[0], 10), selector };


    } catch (error) {
        console.error('Error getting total items count:', error);
        console.error('Selector used:', selector);
        return { count: 0, selector: 'Error getting total items count: ' + selector };

    }
}
