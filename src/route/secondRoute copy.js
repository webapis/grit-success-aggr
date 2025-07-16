

import dotenv from "dotenv";
import scroller, { autoScroll } from "../scrape-helpers/scroller.js";
import isValidImageURL from "../scrape-helpers/isValidImageURL.js";
import isValidURL from "../scrape-helpers/isValidURL.js";
import isValidText from "../scrape-helpers/isValidText.js";
import urls from '../meta/urls.json' assert { type: 'json' };
import commonExcludedPatterns from "../selector-attibutes/commonExcludedPatterns.js";
import paginationPostfix from "../selector-attibutes/paginationPostfix.js";
import productItemSelector from '../selector-attibutes/productItemSelector.js'
import productPageSelector from "../selector-attibutes/productPageSelector.js";
import titleSelector from "../selector-attibutes/titleSelector.js";
import imageSelectors from "../selector-attibutes/imageSelector.js";
import linkSelectors from "../selector-attibutes/linkSelector.js";
import imageAttributes from "../selector-attibutes/imageAttributes.js";
import titleAttribute from "../selector-attibutes/titleAttribute.js";
import getMiddleImageUrl from "../scrape-helpers/getMiddleImageUrl.js";
import getMainDomainPart from "../scrape-helpers/getMainDomainPart.js";
import priceSelector from "../selector-attibutes/priceSelector.js";
import priceAttribute from "../selector-attibutes/priceAttribute.js";
import videoAttribute from "../selector-attibutes/videoAttribute.js";
import videoSelector from "../selector-attibutes/videoSelector.js";
import productNotAvailable from "../selector-attibutes/productNotAvailable.js";
import priceParser from "../scrape-helpers/priceParcer.js";
import  getNextPaginationUrls  from "../scrape-helpers/getNextPaginationUrls.js";
dotenv.config({ silent: true });
debugger
const site = process.env.site;
const siteUrls = urls.find(f => getMainDomainPart(f.urls[0]) === site)


export default async function second({
    page,
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
                const productNotInStock = m.querySelector(params.productNotAvailable) ? true : false;
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
                        productNotInStock,
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
            productNotAvailable: productNotAvailable.join(', '),
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
            const nextPages = await getNextPaginationUrls(page, url, siteUrls.funcPageSelector, foundpaginationPostfix);


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
            if(!imgValid){
                console.log(`Invalid image URLs for item:`,item);
            }
            const {parsedPrices,priceValid} =priceParser(item);

            return {
                ...item,
                price: parsedPrices,
                img: processedImgs,
                imgValid,
                linkValid: isValidURL(item.link),
                titleValid: isValidText(item.title),
                pageTitleValid: isValidText(item.pageTitle),
                priceValid: item.productNotInStock ? true : priceValid,

            };
        });

        return validData
    } else {
        console.log('not product page', url);
        return [];
    }
}