import dotenv from "dotenv";

import titleSelector from "../../selector-attibutes/titleSelector.js";
import imageSelectors from "../../selector-attibutes/imageSelector.js";
import linkSelectors from "../../selector-attibutes/linkSelector.js";
import imageAttributes from "../../selector-attibutes/imageAttributes.js";
import titleAttribute from "../../selector-attibutes/titleAttribute.js";
import priceSelector from "../../selector-attibutes/priceSelector.js";
import priceAttribute from "../../selector-attibutes/priceAttribute.js";
import videoAttributes from "../../selector-attibutes/videoAttributes.js";
import videoSelectors from "../../selector-attibutes/videoSelectors.js";
import productNotAvailable from "../../selector-attibutes/productNotAvailable.js";
import processAndValidateScrapedData from "./validation/processAndValidateScrapedData.js";

// Import all utility functions
import {
    calculateSpecificity,
    executeJavaScriptSelector,
    querySelectorShadowDOM,
    executeJavaScriptShadowSelector,
    querySelectorAllDeep,
    findBestSelectorInContext,
    getPriceElementsWithBestSelector,
    cleanPriceText,
    extractTitleInfo,
    extractImageInfo,
    extractLinkInfo,
    extractVideoInfo,
    extractPriceInfo
} from './extractionUtils.js';

dotenv.config({ silent: true });

// Updated scrapeData function with exposed utility functions
export default async function scrapeData({ page, siteUrls, productItemSelector }) {
    debugger

    // Expose all utility functions to the page context
    await page.exposeFunction('calculateSpecificity', calculateSpecificity);
    await page.exposeFunction('executeJavaScriptSelector', executeJavaScriptSelector);
    await page.exposeFunction('querySelectorShadowDOM', querySelectorShadowDOM);
    await page.exposeFunction('executeJavaScriptShadowSelector', executeJavaScriptShadowSelector);
    await page.exposeFunction('querySelectorAllDeep', querySelectorAllDeep);
    await page.exposeFunction('findBestSelectorInContext', findBestSelectorInContext);
    await page.exposeFunction('getPriceElementsWithBestSelector', getPriceElementsWithBestSelector);
    await page.exposeFunction('cleanPriceText', cleanPriceText);
    await page.exposeFunction('extractTitleInfo', extractTitleInfo);
    await page.exposeFunction('extractImageInfo', extractImageInfo);
    await page.exposeFunction('extractLinkInfo', extractLinkInfo);
    await page.exposeFunction('extractVideoInfo', extractVideoInfo);
    await page.exposeFunction('extractPriceInfo', extractPriceInfo);

    const data = await page.evaluate((params) => {
        const pageTitle = document.title;
        const pageURL = document.URL;

        // Use only the best selector to get candidate items
        const candidateItems = Array.from(document.querySelectorAll(params.productItemSelector)).map(async (m) => {
            try {
                // CONSOLIDATED ELEMENT EXTRACTIONS USING EXPOSED FUNCTIONS
                const titleInfo = await window.extractTitleInfo(m, params.titleSelector, params.titleAttribute);
                const { titleElement, titleSelectorMatched, title, linkFromTitle } = titleInfo;

                const imageInfo = await window.extractImageInfo(m, params.imageSelector, params.imageAttributes);
                const { imgElements, imgSelectorMatched, imgUrls: allImgs, primaryImg } = imageInfo;

                const linkInfo = await window.extractLinkInfo(m, params.linkSelector);
                const { linkElement, linkSelectorMatched } = linkInfo;

                const videoInfo = await window.extractVideoInfo(m, params.videoSelector, params.videoAttribute);
                const { videoElements, videoSelectorMatched, videoUrls: allVideos } = videoInfo;

                const priceInfo = await window.extractPriceInfo(m, params.priceSelector, params.priceAttribute);
                const { priceInfo: priceData, bestPriceSelector, hasShadowDOMPrice } = priceInfo;

                // Product availability check
                const productNotInStock = m.querySelector(params.productNotAvailable.join(', ')) ? true : false;

                // CONSOLIDATED LINK DETERMINATION
                let link = null;
                let linkSource = null;

                if (linkFromTitle) {
                    link = linkFromTitle;
                    linkSource = `titleElement (matched: ${titleSelectorMatched})`;
                } else if (linkElement?.href) {
                    link = linkElement.href;
                    linkSource = `linkElement (matched: ${linkSelectorMatched})`;
                } else if (m?.href) {
                    link = m.href;
                    linkSource = 'containerElement (m)';
                }

                const matchedSelector = params.productItemSelector;

                return {
                    title,
                    img: allImgs,
                    primaryImg,
                    link,
                    price: priceData,
                    videos: allVideos,
                    productNotInStock,
                    matchedInfo: {
                        linkSource,
                        matchedSelector,
                        titleSelectorMatched,
                        imgSelectorMatched,
                        videoSelectorMatched,
                        bestPriceSelector,
                        priceExtractedFromShadowDOM: hasShadowDOMPrice
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
                };
            }
        });

        // Wait for all promises to resolve
        return Promise.all(candidateItems);
    }, {
        productItemSelector: productItemSelector,
        titleSelector: titleSelector,
        titleAttribute: titleAttribute,
        imageSelector: imageSelectors,
        imageAttributes: imageAttributes,
        linkSelector: linkSelectors,
        priceSelector: priceSelector,
        priceAttribute: priceAttribute,
        productNotAvailable: productNotAvailable,
        videoSelector: videoSelectors,
        videoAttribute: videoAttributes
    });

    console.log('candidateItems', (await data).length);

    // Use the extracted processing function
    const validData = processAndValidateScrapedData(await data, siteUrls);
    
    debugger
    return validData;
}