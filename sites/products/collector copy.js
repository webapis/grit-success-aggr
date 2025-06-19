

import dotenv from "dotenv";
import scroller, { autoScroll } from "./scroller.js";
import urls from './urls.json' assert { type: 'json' };
dotenv.config({ silent: true });

const site = process.env.site;
const siteUrls = urls.find(f => f.site === site)
debugger
export default async function first({ page, enqueueLinks, request, log, addRequests, productListSelector }) {

    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 5000));


    });

    // Check if there are any product items on the page




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
    waitForSeconds = 0,
    addRequests,
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
        // --- TITLE ---
        let title = '';
        if (isFunctionString(params.titleSelector)) {
            title = parseFunctionString2(params.titleSelector)(m);
        } else {
            const el = m.querySelector(params.titleSelector);
            title = el?.innerText?.trim();
            if (!title) {
                throw new Error(`Empty or missing innerText for selector: ${params.titleSelector}`);
            }
        }

        // --- IMAGE ---
        let img = '';
        if (isFunctionString(params.imageSelector)) {
            img = parseFunctionString2(params.imageSelector)(m);
        } else {
            const imgEl = m.querySelector(params.imageSelector);
            img = params.imageAttr === 'src' 
                ? imgEl?.src 
                : imgEl?.getAttribute(params.imageAttr);
            if (!img) {
                throw new Error(`Missing or empty image (${params.imageAttr}) for selector: ${params.imageSelector}`);
            }
        }

        // --- LINK ---
        let link = '';
        if (isFunctionString(params.linkSelector)) {
            link = parseFunctionString2(params.linkSelector)(m);
        } else {
            const linkEl = m.querySelector(params.linkSelector);
            link = linkEl?.href;
            if (!link) {
                throw new Error(`Missing or empty link href for selector: ${params.linkSelector}`);
            }
        }

        return {
            title,
            price: 0, // Can be extended
            img,
            link,
            pageTitle,
            pageURL,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        return {
            error: true,
            message: error.message,
            content: m.outerHTML, // helpful for debugging in context
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
        debugger
        if (
            siteUrls.funcPageSelector &&
            url.length > 0 &&
            siteUrls.paginationPostfix.every(sub => !url.includes(sub))
        ) {
            const nextPages = await page.evaluate((funcPageSelector, _url) => {
                const dynamicFunction = eval(funcPageSelector);
                return dynamicFunction(_url)
            }, siteUrls.funcPageSelector, url)


            debugger
            if (nextPages.length > 0) {
                debugger


                console.log('nextPages', nextPages);
                await addRequests(nextPages);

            }
        }

        return data
    } else {
        console.log('not product page', url);
        return [];
    }
}