

import dotenv from "dotenv";
import scroller, { autoScroll } from "./scroller.js";
import isValidImageURL from "../../src/scrap/isValidImageURL.js";
import isValidURL from "../../src/scrap/isValidURL.js";
import isValidText from "../../src/scrap/isValidText.js";
import urls from './urls.json' assert { type: 'json' };
import commonExcludedPatterns from "./helpers/commonExcludedPatterns.js";
import { uploadToGoogleDrive } from './uploadToGoogleDrive.js';
import paginationPostfix from "./helpers/paginationPostfix.js";
import productItemSelector from './helpers/productItemSelector.js'
import titleSelector from "./helpers/titleSelector.js";
import imageSelectors from "./helpers/imageSelector.js";
import linkSelectors from "./helpers/linkSelector.js";
import imageAttributes from "./helpers/imageAttributes.js";
import titleAttribute from "./helpers/titleAttribute.js";
dotenv.config({ silent: true });
debugger
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
            const result = await page.evaluate((excluded) => {
                const seen = new Set();
                const filtered = [];

                Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .forEach(href => {
                        try {
                            if (
                                typeof href === 'string' &&
                                /^https?:\/\//.test(href)
                            ) {
                                const url = new URL(href);

                                // 1. Skip if root path only
                                const isRoot = url.pathname === '/' || url.pathname === '';

                                // 2. Skip if matches excluded pattern
                                const isExcluded = excluded.some(pattern =>
                                    href.toLowerCase().includes(pattern)
                                );

                                const normalized = href.toLowerCase();

                                if (!isRoot && !isExcluded && !seen.has(normalized)) {
                                    seen.add(normalized);
                                    filtered.push(href);
                                }
                            }
                        } catch (e) {
                            // skip invalid URLs
                        }
                    });

                return filtered;
            }, (siteUrls?.excludeUrlPatterns ? [...siteUrls?.excludeUrlPatterns, ...commonExcludedPatterns] : commonExcludedPatterns));

            //   const result = await enqueueLinks({ selector: 'a', exclude: siteUrls ? [...siteUrls.excludeUrlPatterns, ...commonExcludedPatterns] : commonExcludedPatterns, label: 'second' })
            debugger
            console.log('enqueueLinks', result);
            await addRequests(result.map(url => ({ url, label: 'second' })))
            debugger;
        } catch (error) {
            debugger;
        }

    }



}

export async function second({
    page,



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

    // Check if there are any product items on the page
    const productItemsCount = await page.$$eval(siteUrls.productPageSelector || productItemSelector.join(', '), elements => elements.length);
    debugger
    if (productItemsCount > 0) {

        if (isAutoScroll) {
            console.log('autoscrolling')
            await autoScroll(page, 150)
        } else {
            //  await scroller(page, 150, 5);
        }


        const data = await page.evaluate((params) => {



            const pageTitle = document.title
            const pageURL = document.URL;



            return Array.from(document.querySelectorAll(params.productItemSelector)).map(m => {

                const titleElement = m?.querySelector(params.titleSelector)
                const imgElement = m?.querySelector(params.imageSelector)
                const linkElement = m?.querySelector(params.linkSelector)
                console.log('titleElement', titleElement)
                const title = titleElement && params.titleAttribute.split(',').map((attr, i) => titleElement[attr?.replaceAll(" ", "")]).find(Boolean)
                const img = params.imageAttributes.split(',').map((attr, i) => imgElement?.getAttribute(attr?.replaceAll(" ", ""))).find(Boolean)
                const link = titleElement?.href || linkElement?.href
                const matchedSelector = params.productItemSelector
                    .split(',')
                    .map(s => s.trim())
                    .find(selector => m.matches(selector));
                console.log('matchedSelector', matchedSelector)
                try {
                    return {
                        title,
                        // price: 0,
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


            productItemSelector: productItemSelector.join(', '),
            titleSelector: titleSelector.join(', '),
            titleAttribute: titleAttribute.join(', '),
            titleAttr,
            imageSelector: imageSelectors.join(', '),
            imageAttributes: imageAttributes.join(', '),
            imageAttr,
            imagePrefix,
            linkSelector: linkSelectors.join(', '),
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

                const cleanedPatterns = siteUrls.excludeUrlPatterns ? [...commonExcludedPatterns, ...siteUrls.excludeUrlPatterns.map(p => p.replace(/\*/g, ''))] : commonExcludedPatterns
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