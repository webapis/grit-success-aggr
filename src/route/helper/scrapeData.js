import dotenv from "dotenv";
import isValidImageURL from "../../scrape-helpers/isValidImageURL.js";
import isValidVideoURL from "../../scrape-helpers/isValidVideoURL.js";
import isValidURL from "../../scrape-helpers/isValidURL.js";
import isValidText from "../../scrape-helpers/isValidText.js";
import titleSelector from "../../selector-attibutes/titleSelector.js";
import imageSelectors from "../../selector-attibutes/imageSelector.js";
import linkSelectors from "../../selector-attibutes/linkSelector.js";
import imageAttributes from "../../selector-attibutes/imageAttributes.js";
import titleAttribute from "../../selector-attibutes/titleAttribute.js";
import getMiddleImageUrl from "../../scrape-helpers/getMiddleImageUrl.js";
import priceSelector from "../../selector-attibutes/priceSelector.js";
import priceAttribute from "../../selector-attibutes/priceAttribute.js";
import videoAttributes from "../../selector-attibutes/videoAttributes.js";
import videoSelectors from "../../selector-attibutes/videoSelectors.js";
import productNotAvailable from "../../selector-attibutes/productNotAvailable.js";
import priceParser from "../../scrape-helpers/priceParcer.js";
import findBestSelector from "../micro/findBestSelector";
dotenv.config({ silent: true });
// Separate helper function that works with Puppeteer page


// Updated scrapeData function
export default async function scrapeData({ page, siteUrls, productItemSelector }) {
    debugger

    // Get the best selector using the external function
    const selectorResult = await findBestSelector(page, productItemSelector);

    const data = await page.evaluate((params) => {
        const pageTitle = document.title;
        const pageURL = document.URL;

        // Shadow DOM accessor function
        function accessShadowElement(hostSelector, shadowSelector) {
            try {
                const hostElement = document.querySelector(hostSelector);
                if (!hostElement || !hostElement.shadowRoot) {
                    return null;
                }
                return hostElement.shadowRoot.querySelector(shadowSelector);
            } catch (error) {
                return null;
            }
        }

        // Enhanced query function that can handle shadow DOM
        function queryElement(container, selector) {
            // Check for shadow syntax BEFORE calling querySelector
            if (selector.includes('::shadow::')) {
                const [hostSelector, shadowSelector] = selector.split('::shadow::');
                return accessShadowElement(hostSelector.trim(), shadowSelector.trim());
            }

            // Only use normal query for non-shadow selectors
            return container.querySelector(selector);
        }

        // Enhanced query all function that can handle shadow DOM
        function queryAllElements(container, selector) {
            // Check for shadow syntax BEFORE calling querySelectorAll
            if (selector.includes('::shadow::')) {
                const [hostSelector, shadowSelector] = selector.split('::shadow::');
                const hostElement = document.querySelector(hostSelector.trim());
                if (hostElement && hostElement.shadowRoot) {
                    return Array.from(hostElement.shadowRoot.querySelectorAll(shadowSelector.trim()));
                }
                return [];
            }

            // Only use normal query for non-shadow selectors
            return Array.from(container.querySelectorAll(selector));
        }

        // Refactored best selector function (defined inside page.evaluate)
        function findBestSelector(selectors, containerDocument = document) {
            // Find which individual CSS selector has the most matches
            const selectorCounts = selectors.map(selector => ({
                selector,
                count: containerDocument.querySelectorAll(selector).length
            }));

            // Get the selector with the highest count
            const bestSelector = selectorCounts.reduce((best, current) =>
                current.count > best.count ? current : best
            );

            console.log('Selector counts:', selectorCounts);
            console.log('Using best selector:', bestSelector.selector, 'with', bestSelector.count, 'matches');

            return {
                bestSelector,
                selectorCounts,
                selector: bestSelector.selector,
                count: bestSelector.count
            };
        }

        // Use the passed selector result
        const bestSelector = params.selectorResult.bestSelector;

        // Use only the best selector to get candidate items
        const candidateItems = Array.from(document.querySelectorAll(bestSelector.selector)).map(m => {
            // All these are now arrays, no need to split
            const titleSelectors = params.titleSelector;
            const imageSelectors = params.imageSelector;
            const linkSelectors = params.linkSelector;
            const priceSelectors = params.priceSelector;
            const videoSelectors = params.videoSelector;
            const videoAttrList = params.videoAttribute;

            // Title element matching with selector tracking
            const titleElementsWithSelectors = [];
            for (const sel of titleSelectors) {
                const element = queryElement(m, sel);
                if (element) {
                    titleElementsWithSelectors.push({ element, selector: sel });
                    break; // Take first match
                }
            }
            const titleElement = titleElementsWithSelectors[0]?.element || null;
            const titleSelectorMatched = titleElementsWithSelectors[0]?.selector || null;

            // Link element matching with selector tracking
            const linkElementsWithSelectors = [];
            for (const sel of linkSelectors) {
                const element = queryElement(m, sel);
                if (element) {
                    linkElementsWithSelectors.push({ element, selector: sel });
                    break; // Take first match
                }
            }
            const linkElement = linkElementsWithSelectors[0]?.element || null;

            // Image elements matching with selector tracking
            const imgElementsWithSelectors = [];
            for (const sel of imageSelectors) {
                const elements = queryAllElements(m, sel);
                for (const element of elements) {
                    // Avoid duplicates
                    const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                    if (!alreadyExists) {
                        imgElementsWithSelectors.push({ element, selector: sel });
                    }
                }
            }
            const imgElements = imgElementsWithSelectors.map(item => item.element);
            const firstImgElement = imgElements[0] || null;
            const imgSelectorMatched = imgElementsWithSelectors[0]?.selector || null;

            const productNotInStock = queryElement(m, params.productNotAvailable.join(', ')) ? true : false;

            const imgUrls = imgElements.flatMap(el =>
                params.imageAttributes
                    .map(attr => el?.getAttribute(attr?.replaceAll(" ", "")))
                    .filter(Boolean)
            );

            function getBackgroundImageUrl(el) {
                const bgImage = el?.style.backgroundImage;
                const urlMatch = bgImage?.match(/url\(["']?(.*?)["']?\)/);
                return urlMatch ? urlMatch[1] : null;
            }

            const bgImgs = imgElements
                .map(el => getBackgroundImageUrl(el))
                .filter(Boolean);

            const allImgs = [...new Set([...imgUrls, ...bgImgs])];
            const primaryImg = allImgs[0] || null;

            const title = titleElement &&
                params.titleAttribute
                    .map(attr => titleElement[attr?.replaceAll(" ", "")])
                    .find(Boolean);

            // Price elements matching with proper selector tracking
            const priceInfo = [];
            const priceSelectorsMatched = new Set();

            // Collect price elements WITH their source selectors
            const priceElementsWithSelectors = [];
            for (const sel of priceSelectors) {
                const elements = queryAllElements(m, sel);
                for (const element of elements) {
                    // Avoid duplicates by checking if this element was already found
                    const alreadyExists = priceElementsWithSelectors.some(item => item.element === element);
                    if (!alreadyExists) {
                        priceElementsWithSelectors.push({ 
                            element, 
                            selector: sel  // Store the actual selector that found this element
                        });
                    }
                }
            }

            // Process each element with its correct selector
            for (const { element: priceEl, selector: matchedSelector } of priceElementsWithSelectors) {
                priceSelectorsMatched.add(matchedSelector);

                const priceAttrList = params.priceAttribute;
                for (const attr of priceAttrList) {
                    let value = priceEl[attr]?.trim();
                    if (value) {
                        priceInfo.push({
                            value,
                            selector: matchedSelector, // This is now the correct selector
                            attribute: attr
                        });
                        break;
                    }
                }
            }

            // Video elements matching with selector tracking
            const videoElementsWithSelectors = [];
            for (const sel of videoSelectors) {
                const elements = queryAllElements(m, sel);
                for (const element of elements) {
                    // Avoid duplicates
                    const alreadyExists = videoElementsWithSelectors.some(item => item.element === element);
                    if (!alreadyExists) {
                        videoElementsWithSelectors.push({ element, selector: sel });
                    }
                }
            }
            const videoElements = videoElementsWithSelectors.map(item => item.element);
            const firstVideoElement = videoElements[0] || null;
            const videoSelectorMatched = videoElementsWithSelectors[0]?.selector || null;

            const videoUrls = videoElements
                .flatMap(el =>
                    videoAttrList
                        .map(attr => el?.getAttribute(attr))
                        .filter(Boolean)
                );

            const allVideos = [...new Set(videoUrls)];

            let link = null;
            let linkSource = null;

            if (titleElement?.href) {
                link = titleElement.href;
                linkSource = `titleElement (matched: ${titleSelectorMatched})`;
            } else if (linkElement?.href) {
                const linkSelectorMatched = linkElementsWithSelectors[0]?.selector || null;
                link = linkElement.href;
                linkSource = `linkElement (matched: ${linkSelectorMatched})`;
            } else if (m?.href) {
                link = m.href;
                linkSource = 'containerElement (m)';
            }

            // Use the best selector that was actually used
            const matchedSelector = bestSelector.selector;
            const matchedProductItemSelectorManual = params.productItemSelectorManual
                .find(selector => m.matches(selector));

            try {
                return {
                    title,
                    img: allImgs,
                    primaryImg,
                    link,
                    price: priceInfo,
                    videos: allVideos,
                    productNotInStock,
                    matchedInfo: {
                        linkSource,
                        matchedSelector,
                        matchedProductItemSelectorManual,
                        titleSelectorMatched,
                        imgSelectorMatched,
                        videoSelectorMatched,
                        priceSelectorsMatched: Array.from(priceSelectorsMatched),
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
        // Pass arrays directly instead of joining them
        productItemSelector: productItemSelector,
        productItemSelectorManual: productItemSelector,
        selectorResult: selectorResult,  // Pass the selector result
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

    const validData = data.map(item => {
        const processedImgs = (item.img || [])
            .map(m => getMiddleImageUrl(m, siteUrls.imageCDN || siteUrls.urls[0]))
            .filter(Boolean);

        const imgValid = processedImgs.some(isValidImageURL);
        if (!imgValid) {
            console.log(`Invalid image URLs for item:`, item);
        }
        const videoValid = item.videos && item.videos.length > 0 && item.videos.every(isValidVideoURL);
        const { parsedPrices, priceValid } = priceParser(item);

        return {
            ...item,
            price: parsedPrices,
            img: processedImgs,
            imgValid,
            linkValid: isValidURL(item.link),
            titleValid: isValidText(item.title),
            pageTitleValid: isValidText(item.pageTitle),
            priceValid: item.productNotInStock ? true : priceValid,
            videoValid,
            mediaType: item.videos && item.videos.length > 0 ? 'video' : 'image'
        };
    });
    debugger
    return validData;
}