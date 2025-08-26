import itemCounterSelector from "../../selector-attibutes/itemCounterSelector.js";

export default async function getTotalItemsCount(page, totalProductCounterSelector) {
    debugger;
    console.log('totalProductCounterSelector----------------!!', totalProductCounterSelector);

    // Handle special cases first
    if (totalProductCounterSelector === 'none') {
        return { count: 0, selector: 'none' };
    }

    // Original selector-based logic
    const selectorToUse = totalProductCounterSelector || itemCounterSelector;
    let selector = selectorToUse;
    // Check if totalProductCounterSelector is JavaScript code (contains common JS patterns)
    const isJavaScriptCode = selector && (
        totalProductCounterSelector.includes('document.querySelector') ||
        totalProductCounterSelector.includes('document.querySelectorAll') ||
        totalProductCounterSelector.includes('.innerText') ||
        totalProductCounterSelector.includes('.textContent') ||
        totalProductCounterSelector.includes('.split(') ||
        totalProductCounterSelector.includes('.filter(')
    );

    if (isJavaScriptCode) {
        try {
            console.log('Executing JavaScript code:', totalProductCounterSelector);

            // Execute the JavaScript code in the browser context
            const result = await page.evaluate((jsCode) => {
                try {
                    // Use Function constructor to safely evaluate the code
                    const func = new Function('return ' + jsCode);
                    return func();
                } catch (error) {
                    console.error('Error executing JS code:', error);
                    return null;
                }
            }, totalProductCounterSelector);

            if (result !== null && result !== undefined) {
                const count = parseInt(result, 10);
                if (!isNaN(count)) {
                    return { count, selector: `JavaScript: ${totalProductCounterSelector}` };
                }
            }

            console.warn('JavaScript execution returned invalid result:', result);
            return { count: 0, selector: `JavaScript execution failed: ${totalProductCounterSelector}` };

        } catch (error) {
            console.error('Error executing JavaScript code:', error);
            return { count: 0, selector: `JavaScript execution error: ${totalProductCounterSelector}` };
        }
    }



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