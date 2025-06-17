

import scroller, { autoScroll } from "./scroller.js";
export default async function first({ page, enqueueLinks, request, log, addRequests }) {
    debugger

    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 5000));
    });
    console.log('inside first route')
    await enqueueLinks({
        selector: 'a',
        label: 'second',
    });

}

export async function second({
    page,
    productListSelector,
    productItemSelector,
    titleSelector,
    titleAttr = "innerText",
    imageSelector,
    imageAttr = 'src',
    imagePrefix = '',
    linkSelector,
    isAutoScroll = false,
    breadcrumb = () => "",
    waitForSeconds = 0
}) {
    const url = await page.url();

    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1)); // Wait for specified seconds
        }, waitForSeconds);
    }

    // Check if there are any product items on the page
    const productItemsCount = await page.$$eval(productListSelector, elements => elements.length);

    if (productItemsCount > 0) {
        if (isAutoScroll) {
            console.log('autoscrolling')
            await autoScroll(page, 150)
        } else {
            await scroller(page, 150, 5);
        }


        const data = await page.evaluate((params) => {

            function isFunctionString(str) {
                // If it's not a string, return false
                if (typeof str !== 'string') return false;

                // Trim whitespace
                str = str.trim();

                try {
                    // Test for arrow function pattern
                    const arrowFnPattern = /^\([^)]*\)\s*=>\s*.+/;
                    if (arrowFnPattern.test(str)) {
                        // Try to evaluate the arrow function
                        const fn = new Function(`return ${str}`)();
                        return typeof fn === 'function';
                    }

                    // Test for regular function pattern
                    const regularFnPattern = /^function\s*\([^)]*\)\s*{[\s\S]*}$/;
                    if (regularFnPattern.test(str)) {
                        // Try to evaluate the regular function
                        const fn = new Function(`return ${str}`)();
                        return typeof fn === 'function';
                    }

                    return false;
                } catch (e) {
                    return false;
                }
            }
            function parseFunctionString2(functionString) {
                // Remove the arrow function syntax if present
                const arrowFunctionMatch = functionString.match(/^\((.*?)\)\s*=>\s*(.*)$/);

                if (arrowFunctionMatch) {
                    const [, params, body] = arrowFunctionMatch;
                    return new Function(params, `return ${body}`);
                }

                // For regular functions
                return new Function('return ' + functionString)();
            }

            const breadcrumbFunc = isFunctionString(params.breadcrumb) ? parseFunctionString2(params.breadcrumb)(document) : ''
            const pageTitle = document.title + ' ' + breadcrumbFunc;
            const pageURL = document.URL;



            return Array.from(document.querySelectorAll(params.productItemSelector)).map(m => {
                try {
                    const title = isFunctionString(params.titleSelector) ? parseFunctionString2(params.titleSelector)(m) : m.querySelector(params.titleSelector).innerText;
                    const img = isFunctionString(params.imageSelector) ? parseFunctionString2(params.imageSelector)(m) : (params.imageAttr === 'src' ? m.querySelector(params.imageSelector).src : m.querySelector(params.imageSelector).getAttribute(params.imageAttr))
                    const link = isFunctionString(params.linkSelector) ? parseFunctionString2(params.linkSelector)(m) : m.querySelector(params.linkSelector).href;

                    return {
                        title,
                        price: 0, // Assuming price is fetched later
                        img,
                        link,
                        pageTitle,
                        pageURL
                    };
                } catch (error) {
                    return {
                        error: true,
                        message: error.message,
                        content: m.innerHTML
                    };
                }
            });
        }, {

            productListSelector,
            productItemSelector,
            titleSelector,
            titleAttr,
            imageSelector,
            imageAttr,
            imagePrefix,
            linkSelector,
            autoScroll,
            breadcrumb
        });

        console.log('data.length', data.length);
        console.log('error.length', data.filter(f => f.error).length);
        if (data.filter(f => f.error).length > 0) {
            console.log(data.filter(f => f.error)[0]);
        }
        return data
    } else {
        console.log('not product page', url);
        return [];
    }
}