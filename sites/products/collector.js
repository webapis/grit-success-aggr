

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
import productPageSelector from "./helpers/productPageSelector.js";
import titleSelector from "./helpers/titleSelector.js";
import imageSelectors from "./helpers/imageSelector.js";
import linkSelectors from "./helpers/linkSelector.js";
import imageAttributes from "./helpers/imageAttributes.js";
import titleAttribute from "./helpers/titleAttribute.js";
import getMiddleImageUrl from "../../src/scrap/getMiddleImageUrl.js";
import getMainDomainPart from "../../src/scrap/getMainDomainPart.js";
import priceSelector from "./helpers/priceSelector.js";
import priceAttribute from "./helpers/priceAttribute.js";
import mapPrice from "../../src/scrap/mapPrice.mjs";

dotenv.config({ silent: true });
debugger
const site = process.env.site;
const siteUrls = urls.find(f => getMainDomainPart(f.urls[0]) === site)


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
            const result = await page.evaluate(() => {
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
                                const isRoot = url.pathname === '/' || url.pathname === '';

                                const normalized = href.toLowerCase();
                                if (!isRoot && !seen.has(normalized)) {
                                    seen.add(normalized);
                                    filtered.push(href);
                                }
                            }
                        } catch (e) {
                            // skip invalid URLs
                        }
                    });

                return filtered;
            });

            debugger
            console.log('enqueueLinks', result);
            // Filter out common excluded patterns
            const combinedExcludedPatterns = [
                ...commonExcludedPatterns,
                ...(siteUrls?.excludeUrlPatterns || []),
            ];
            const filteredResult = result.filter(url =>
                !combinedExcludedPatterns.some(pattern => url.toLowerCase().includes(pattern))
            );
            console.log('filteredResult', filteredResult);
            await addRequests(filteredResult.map(url => ({ url, label: 'second' })));
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
    const productItemsCount = await page.$$eval(productPageSelector.join(', '), elements => elements.length);
    debugger
    if (productItemsCount > 0) {

        if (isAutoScroll) {
            console.log('autoscrolling')
            await autoScroll(page, 150)
        } else {
            //  await scroller(page, 150, 5);
        }


        const data = await page.evaluate((params) => {
            function getBackgroundImageUrl(el) {
                const bgImage = el?.style.backgroundImage;
                const urlMatch = bgImage?.match(/url\(["']?(.*?)["']?\)/);
                return urlMatch ? urlMatch[1] : null;
            }

            const pageTitle = document.title;
            const pageURL = document.URL;

            // Find which selector matched from productPageSelector list
            const pageSelectors = params.productPageSelector.split(',').map(s => s.trim());
            let matchedDocument = null;
            let matchedPageSelector = null;
            for (const sel of pageSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                    matchedDocument = el;
                    matchedPageSelector = sel;
                    console.log('---matchedPageSelector', matchedPageSelector, el);
                    break;
                }
            }

            const usedFallbackDocument = !matchedDocument;
            const selectedDocument = matchedDocument || document;

            return Array.from(selectedDocument.querySelectorAll(params.productItemSelector)).map(m => {
                const titleSelectors = params.titleSelector.split(',').map(s => s.trim());
                const imageSelectors = params.imageSelector.split(',').map(s => s.trim());
                const linkSelectors = params.linkSelector.split(',').map(s => s.trim());
                const priceSelectors = params.priceSelector.split(',').map(s => s.trim());

                const titleElement = titleSelectors.map(sel => m.querySelector(sel)).find(Boolean);
                const linkElement = linkSelectors.map(sel => m.querySelector(sel)).find(Boolean);

                // Get all image elements per product
                const imgElements = imageSelectors.flatMap(sel => Array.from(m.querySelectorAll(sel)));

                // Extract image URLs from attributes
                const imgUrls = imgElements.flatMap(el =>
                    params.imageAttributes
                        .split(',')
                        .map(attr => el?.getAttribute(attr?.replaceAll(" ", "")))
                        .filter(Boolean)
                );

                // Extract image URLs from background-image
                const bgImgs = imgElements
                    .map(el => getBackgroundImageUrl(el))
                    .filter(Boolean);

                // Combine and remove duplicates
                const allImgs = [...new Set([...imgUrls, ...bgImgs])];
                const primaryImg = allImgs[0] || null;

                const titleSelectorMatched = titleElement
                    ? titleSelectors.find(sel => titleElement.matches(sel))
                    : null;

                const firstImgElement = imgElements[0];
                const imgSelectorMatched = firstImgElement
                    ? imageSelectors.find(sel => firstImgElement.matches(sel))
                    : null;

                const title = titleElement &&
                    params.titleAttribute
                        .split(',')
                        .map(attr => titleElement[attr?.replaceAll(" ", "")])
                        .find(Boolean);

                // MULTIPLE PRICE EXTRACTION
                const priceInfo = [];
                const matchedPriceElements = priceSelectors
                    .flatMap(sel => Array.from(m.querySelectorAll(sel)))
                    .filter(Boolean);

                for (const priceEl of matchedPriceElements) {
                    const matchedSelector = priceSelectors.find(sel => priceEl.matches(sel));
                    const priceAttrList = params.priceAttribute.split(',').map(attr => attr.trim());

                    for (const attr of priceAttrList) {
                        let value = null;

                  
                            value = priceEl[attr]?.trim();
                     

                        if (value) {
                            priceInfo.push({
                                value,
                                selector: matchedSelector,
                                attribute: attr
                            });
                            break; // stop at first valid attribute per element
                        }
                    }
                }

                let link = null;
                let linkSource = null;

                if (titleElement?.href) {
                    link = titleElement.href;
                    linkSource = `titleElement (matched: ${titleSelectorMatched})`;
                } else if (linkElement?.href) {
                    const linkSelectorMatched = linkSelectors.find(sel => linkElement.matches(sel));
                    link = linkElement.href;
                    linkSource = `linkElement (matched: ${linkSelectorMatched})`;
                } else if (m?.href) {
                    link = m.href;
                    linkSource = 'containerElement (m)';
                }

                const matchedSelector = params.productItemSelector
                    .split(',')
                    .map(s => s.trim())
                    .find(selector => m.matches(selector));

                try {
                    return {
                        title,
                        img: allImgs,
                        primaryImg,
                        link,
                        price: priceInfo, // array of prices
                        matchedInfo: {
                            linkSource,
                            matchedSelector,
                            titleSelectorMatched,
                            imgSelectorMatched,
                            usedFallbackDocument,
                            matchedPageSelector
                        },
                        pageTitle,
                        pageURL,
                        timestamp: new Date().toISOString(),
                    };
                } catch (error) {
                    return {
                        error: true,
                        message: error.message,
                        content: m.outerHTML,
                        url: document.URL,
                        pageTitle,
                        matchedInfo: {
                            usedFallbackDocument,
                            matchedPageSelector
                        }
                    };
                }
            });
        }, {
            productPageSelector: productPageSelector.join(', '),
            productItemSelector: productItemSelector.join(', '),
            titleSelector: titleSelector.join(', '),
            titleAttribute: titleAttribute.join(', '),
            imageSelector: imageSelectors.join(', '),
            imageAttributes: imageAttributes.join(', '),
            linkSelector: linkSelectors.join(', '),
            priceSelector: priceSelector.join(', '),
            priceAttribute: priceAttribute.join(', '),
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
            const processedImgs = (item.img || [])
                .map(m => getMiddleImageUrl(m, siteUrls.imageCDN || siteUrls.urls[0]))
                .filter(Boolean);

            const imgValid = processedImgs.some(isValidImageURL);

            const parsedPrices = Array.isArray(item.price)
                ? item.price.map(priceObj => {
                    try {
                        const numericPrice = mapPrice(priceObj.value); // or priceObj.rawValue if that is correct

                        return {
                            ...priceObj,
                            numericValue: numericPrice
                        };
                    } catch (error) {
                        return {
                            ...priceObj,
                            numericValue: 0,
                            error: error.message
                        };
                    }
                })
                : [];

            const priceValid = parsedPrices.length > 0 && parsedPrices.some(p => typeof p.numericValue === 'number' && p.numericValue > 0);
                if(!priceValid){
                    console.log('Invalid price data for item:', item);
                }
            return {
                ...item,
                price: parsedPrices,
                img: processedImgs,
                imgValid,
                linkValid: isValidURL(item.link),
                titleValid: isValidText(item.title),
                pageTitleValid: isValidText(item.pageTitle),
                priceValid,
              
            };
        });

        return validData
    } else {
        console.log('not product page', url);
        return [];
    }
}