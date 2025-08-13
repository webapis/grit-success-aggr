import dotenv from "dotenv";
import isValidImageURL from "../../scrape-helpers/isValidImageURL.js";
import isValidURL from "../../scrape-helpers/isValidURL.js";
import isValidText from "../../scrape-helpers/isValidText.js";
import productItemSelector from '../../selector-attibutes/productItemSelector.js';
import productPageSelector from "../../selector-attibutes/productPageSelector.js";
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


dotenv.config({ silent: true });

export default async function scrapeData({ page, siteUrls }) {
    debugger

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
    const candidateItems = Array.from(selectedDocument.querySelectorAll(params.productItemSelector)).map(m => {
        const titleSelectors = params.titleSelector.split(',').map(s => s.trim());
        const imageSelectors = params.imageSelector.split(',').map(s => s.trim());
        const linkSelectors = params.linkSelector.split(',').map(s => s.trim());
        const priceSelectors = params.priceSelector.split(',').map(s => s.trim());
        const videoSelectors = params.videoSelector.split(',').map(s => s.trim());
        const videoAttrList = params.videoAttribute.split(',').map(attr => attr.trim());

        const titleElement = titleSelectors.map(sel => queryElement(m, sel)).find(Boolean);
        const linkElement = linkSelectors.map(sel => queryElement(m, sel)).find(Boolean);

        const imgElements = imageSelectors.flatMap(sel => queryAllElements(m, sel));
        const productNotInStock = queryElement(m, params.productNotAvailable) ? true : false;

        const imgUrls = imgElements.flatMap(el =>
            params.imageAttributes
                .split(',')
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

        const titleSelectorMatched = titleElement
            ? titleSelectors.find(sel => {
                // Handle shadow selectors
                if (sel.includes('::shadow::')) {
                    return sel; // Return the full shadow selector
                }
                return titleElement.matches(sel) ? sel : null;
            })
            : null;

        const firstImgElement = imgElements[0];
        const imgSelectorMatched = firstImgElement
            ? imageSelectors.find(sel => {
                if (sel.includes('::shadow::')) {
                    return sel;
                }
                return firstImgElement.matches(sel) ? sel : null;
            })
            : null;

        const title = titleElement &&
            params.titleAttribute
                .split(',')
                .map(attr => titleElement[attr?.replaceAll(" ", "")])
                .find(Boolean);

        const priceInfo = [];
        const priceSelectorsMatched = new Set();
        
        // Enhanced price element matching with shadow DOM support
        const matchedPriceElements = priceSelectors
            .flatMap(sel => queryAllElements(m, sel))
            .filter(Boolean);

        for (const priceEl of matchedPriceElements) {
            const matchedSelector = priceSelectors.find(sel => {
                if (sel.includes('::shadow::')) {
                    return sel; // Return shadow selector as-is
                }
                return priceEl.matches(sel) ? sel : null;
            });
            
            if (matchedSelector) {
                priceSelectorsMatched.add(matchedSelector);
            }

            const priceAttrList = params.priceAttribute.split(',').map(attr => attr.trim());
            for (const attr of priceAttrList) {
                let value = priceEl[attr]?.trim();
                if (value) {
                    priceInfo.push({
                        value,
                        selector: matchedSelector,
                        attribute: attr
                    });
                    break;
                }
            }
        }

        const videoElements = videoSelectors.flatMap(sel => queryAllElements(m, sel));
        const videoUrls = videoElements
            .flatMap(el =>
                videoAttrList
                    .map(attr => el?.getAttribute(attr))
                    .filter(Boolean)
            );

        const allVideos = [...new Set(videoUrls)];
        const firstVideoElement = videoElements[0];
        const videoSelectorMatched = firstVideoElement
            ? videoSelectors.find(sel => {
                if (sel.includes('::shadow::')) {
                    return sel;
                }
                return firstVideoElement.matches(sel) ? sel : null;
            })
            : null;

        let link = null;
        let linkSource = null;

        if (titleElement?.href) {
            link = titleElement.href;
            linkSource = `titleElement (matched: ${titleSelectorMatched})`;
        } else if (linkElement?.href) {
            const linkSelectorMatched = linkSelectors.find(sel => {
                if (sel.includes('::shadow::')) {
                    return sel;
                }
                return linkElement.matches(sel) ? sel : null;
            });
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
        const matchedProductItemSelectorManual = params.productItemSelectorManual.split(',')
            .map(s => s.trim())
            .find(selector => m.matches(selector));

        try {
            debugger
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
                    usedFallbackDocument,
                    matchedPageSelector
                },
                pageTitle,
                pageURL,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            debugger
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
    
    console.log('candidateItems', candidateItems.length)
    debugger
    return candidateItems
}, {
    productPageSelector: productPageSelector.join(', '),
    productItemSelector: productItemSelector.join(', '),
    productItemSelectorManual: productItemSelector.join(', '),
    titleSelector: titleSelector.join(', '),
    titleAttribute: titleAttribute.join(', '),
    imageSelector: imageSelectors.join(', '),
    imageAttributes: imageAttributes.join(', '),
    linkSelector: linkSelectors.join(', '),
    priceSelector: priceSelector.join(', '),
    priceAttribute: priceAttribute.join(', '),
    productNotAvailable: productNotAvailable.join(', '),
    videoSelector: videoSelectors.join(', '),
    videoAttribute: videoAttributes.join(', ')
});
    const validData = data.map(item => {
        const processedImgs = (item.img || [])
            .map(m => getMiddleImageUrl(m, siteUrls.imageCDN || siteUrls.urls[0]))
            .filter(Boolean);

        const imgValid = processedImgs.some(isValidImageURL);
        if (!imgValid) {
            console.log(`Invalid image URLs for item:`, item);
        }
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
        };
    });
    debugger
    return validData;
}
