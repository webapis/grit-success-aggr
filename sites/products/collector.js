

import dotenv from "dotenv";
import scroller, { autoScroll } from "./scroller.js";
import isValidImageURL from "../../src/scrap/isValidImageURL.js";
import isValidURL from "../../src/scrap/isValidURL.js";
import isValidText from "../../src/scrap/isValidText.js";
import urls from './urls.json' assert { type: 'json' };
import commonExcludedPatterns from "./helpers/commonExcludedPatterns.js";
import { uploadToGoogleDrive } from './uploadToGoogleDrive.js';
import paginationPostfix from "./helpers/paginationPostfix.js";
dotenv.config({ silent: true });

const site = process.env.site;
const siteUrls = urls.find(f => f.site === site)


export default async function first({ page, enqueueLinks, request, log, addRequests, productListSelector, excludeUrlPatterns, pageSelector }) {

    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));


    });

    // take screenshot and upload to google drive
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    const uploadResult = await uploadToGoogleDrive({
        buffer: screenshotBuffer,
        fileName: `screenshot-${site}-${Date.now()}.png`,
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        serviceAccountCredentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')),
    });

    console.log('📸 Screenshot uploaded:', uploadResult.webViewLink);



    console.log('inside first route')

    if (siteUrls.navigationUrls) {
        try {


            let result = await page.evaluate((navigationUrls) => {
                const dynamicFunction = eval(navigationUrls);

                return dynamicFunction;

            }, siteUrls.navigationUrls);

            if (!Array.isArray(result)) {

                result = await eval(siteUrls.navigationUrls)(page);
            }

            console.log('navigationUrls', result);
            const mappedUrls = result.filter(url => typeof url === 'string' && /^https?:\/\//.test(url)).map(url => ({ url, label: 'second' }));

            await addRequests(mappedUrls);

        } catch (error) {
            console.log('Error in navigationUrls:', error);
        }

    } else {

        try {
            const result = await enqueueLinks({ selector: 'a', exclude: siteUrls && siteUrls.excludeUrlPatterns, label: 'second' })

            console.log('enqueueLinks', result);
            debugger;
        } catch (error) {
            debugger;
        }

    }



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

    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });


    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1)); // Wait for specified seconds
        }, waitForSeconds);
    }
    console.log('product-list-container', productListSelector)
    // Check if there are any product items on the page
    const productItemsCount = await page.$$eval(productItemSelector, elements => elements.length);

    if (productItemsCount > 0) {

        if (isAutoScroll) {
            console.log('autoscrolling')
            await autoScroll(page, 150)
        } else {
            //  await scroller(page, 150, 5);
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
                    // TITLE
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

                    // IMAGE

                    let img = '';
                    if (isFunctionString(params.imageSelector)) {
                        img = parseFunctionString2(params.imageSelector)(m);
                    } else {
                        const el = m.querySelector(params.imageSelector);
                        if (!el) {
                            throw new Error(`Image element not found for selector: ${params.imageSelector}`);
                        }
                        img = params.imageAttr === 'src' ? el.src : el.getAttribute(params.imageAttr);
                        if (!img || img.trim() === '') {
                            throw new Error(`Empty image attribute (${params.imageAttr}) for selector: ${params.imageSelector}`);
                        }
                    }


                    // LINK
                    let link = '';
                    if (isFunctionString(params.linkSelector)) {
                        link = parseFunctionString2(params.linkSelector)(m);
                    } else {
                        const el = m.querySelector(params.linkSelector);
                        if (!el) {
                            throw new Error(`Link element not found for selector: ${params.linkSelector}`);
                        }
                        link = el.href;
                        if (!link || link.trim() === '') {
                            throw new Error(`Empty href attribute for selector: ${params.linkSelector}`);
                        }
                    }

                    return {
                        title,
                        price: 0,
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
                        content: m.outerHTML, // better than innerHTML for debugging
                        url: document.URL,
                        pageTitle,
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
        //next pages
        if (
            siteUrls.funcPageSelector &&
            url.length > 0 &&
            paginationPostfix.every(sub => !url.includes(sub))
        ) {
            const foundpaginationPostfix = paginationPostfix.find(sub => !url.includes(sub))
            debugger

            const nextPages = await page.evaluate((funcPageSelector, _url, _paginationPostfix,) => {
                if (funcPageSelector.length === 1) {
                    const paginationSelector = funcPageSelector[0];
                    const nxtUrls = Array.from({ length: Math.max(...[...document.querySelectorAll(paginationSelector)].map(m => m.innerText).filter(f => Number(f))) - 1 }, (_, i) => i + 2).map(pageNumber => _url + _paginationPostfix[0] + pageNumber)

                    return nxtUrls
                }
                else if (funcPageSelector.length === 2) {
                    try {
                        const pageCounterSelector = funcPageSelector[0];
                        const itemsPerPage = funcPageSelector[1];
                        const courrentItemCount = Number(document.querySelector(pageCounterSelector).innerText.replace(/\D/g, '') || 0);
                        if (Number(document.querySelector(pageCounterSelector).innerText.replace(/\D/g, '') || 0) > itemsPerPage) {
                            const nxtUrls = [...Array(Math.round(courrentItemCount / itemsPerPage) - 1)].map((_, i) => i + 2).map(pageNumber => _url + _paginationPostfix + pageNumber)
                            return nxtUrls
                        }
                        else { return [] }
                    } catch (error) {
                        return error;
                    }

                }

            }, siteUrls.funcPageSelector, url, foundpaginationPostfix)

            debugger;

            if (nextPages.length > 0) {

                const cleanedPatterns =siteUrls.excludeUrlPatterns? [...commonExcludedPatterns, ...siteUrls.excludeUrlPatterns.map(p => p.replace(/\*/g, ''))  ]:commonExcludedPatterns
                const filtered = nextPages
                    .filter(url => !cleanedPatterns.some(pattern => url.toLowerCase().includes(pattern)))
                    .map(url => ({ url: url.replace('??', '?'), label: 'second' }));

                console.log('filtered', filtered);
                await addRequests(filtered);

            }
        }

        const validData = data.map(item => {
            return {
                ...item,
                imgValid: isValidImageURL(item.img),
                linkValid: isValidURL(item.link),
                titleValid: isValidText(item.title),
                pageTitleValid: isValidText(item.pageTitle),


            }
        })

        return validData
    } else {
        console.log('not product page', url);
        return [];
    }
}