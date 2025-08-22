import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

dotenv.config({ silent: true });

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Method 1: Read the utilities file and inject as string
async function getPageUtilitiesScript() {
    const utilitiesPath = path.join(__dirname, 'pageUtilities.js');
    const utilitiesCode = fs.readFileSync(utilitiesPath, 'utf8');
    
    // Remove the export statements and auto-injection code for browser use
    const browserCode = utilitiesCode
        .replace(/^export\s+{[\s\S]*?};\s*$/m, '') // Remove export statement
        .replace(/^\/\/\s*Export\s+for\s+Node\.js[\s\S]*$/m, '') // Remove export section
        .concat(`\n// Auto-inject utilities\ninjectPageUtilities();`); // Add injection call
    
    return browserCode;
}

// Method 2: Alternative - convert functions to string (more dynamic but less maintainable)
function convertFunctionToString(func) {
    return func.toString();
}

export default async function scrapeData({ page, siteUrls, productItemSelector }) {
    debugger

    // Method 1: Inject utilities from file
    const utilitiesScript = await getPageUtilitiesScript();
    await page.addScriptTag({ content: utilitiesScript });

    // Method 2: Alternative approach - import and convert to string
    /*
    import { injectPageUtilities } from './pageUtilities.js';
    await page.addScriptTag({ 
        content: `(${convertFunctionToString(injectPageUtilities)})(); ${convertFunctionToString(injectPageUtilities)}` 
    });
    */

    const data = await page.evaluate((params) => {
        const pageTitle = document.title;
        const pageURL = document.URL;

        // Use only the best selector to get candidate items
        const candidateItems = Array.from(document.querySelectorAll(params.productItemSelector)).map((m) => {
            try {
                // CONSOLIDATED ELEMENT EXTRACTIONS USING INJECTED FUNCTIONS
                const titleInfo = window.extractTitleInfo(m, params.titleSelector, params.titleAttribute);
                const { titleElement, titleSelectorMatched, title, linkFromTitle } = titleInfo;

                const imageInfo = window.extractImageInfo(m, params.imageSelector, params.imageAttributes);
                const { imgElements, imgSelectorMatched, imgUrls: allImgs, primaryImg } = imageInfo;

                const linkInfo = window.extractLinkInfo(m, params.linkSelector);
                const { linkElement, linkSelectorMatched } = linkInfo;

                const videoInfo = window.extractVideoInfo(m, params.videoSelector, params.videoAttribute);
                const { videoElements, videoSelectorMatched, videoUrls: allVideos } = videoInfo;

                const priceInfo = window.extractPriceInfo(m, params.priceSelector, params.priceAttribute);
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

        console.log('candidateItems', candidateItems.length);
        return candidateItems;
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

    // Use the extracted processing function
    const validData = processAndValidateScrapedData(data, siteUrls);
    
    debugger
    return validData;
}