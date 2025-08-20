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

dotenv.config({ silent: true });
// Separate helper function that works with Puppeteer page


// Updated scrapeData function
// Updated scrapeData function with enhanced price selector support
// Enhanced scrapeData function with findBestSelector integration
export default async function scrapeData({ page, siteUrls, productItemSelector }) {
    debugger

    const data = await page.evaluate((params) => {
        const pageTitle = document.title;
        const pageURL = document.URL;

        // Import the findBestSelector logic directly into the page context
        function calculateSpecificity(selector) {
            let score = 0;
            
            // Count IDs (#id, [id*=], [id^=], etc.)
            const idMatches = selector.match(/#[\w-]+|\[id[\*\^$~|]?=/g);
            score += (idMatches || []).length * 100;
            
            // Count classes (.class), attributes ([attr]), and pseudo-classes (:pseudo)
            const classMatches = selector.match(/\.[\w-]+|\[[\w-]+[\*\^$~|]?=|\:[\w-]+(?:\([^)]*\))?/g);
            score += (classMatches || []).length * 10;
            
            // Count elements (div, span, article, etc.)
            const elementMatches = selector.match(/(?:^|[\s>+~])([a-zA-Z][\w-]*)/g);
            score += (elementMatches || []).length * 1;
            
            // Bonus for descendant combinators (spaces) - indicates more specific targeting
            const descendantMatches = selector.match(/\s+(?![>+~])/g);
            score += (descendantMatches || []).length * 5;
            
            // Bonus for direct child combinators (>)
            const childMatches = selector.match(/>/g);
            score += (childMatches || []).length * 3;
            
            // Bonus for negation selectors (:not()) - they're more specific
            const notMatches = selector.match(/:not\([^)]+\)/g);
            score += (notMatches || []).length * 8;
            
            // Bonus for :has() selectors - they're very specific
            const hasMatches = selector.match(/:has\([^)]+\)/g);
            score += (hasMatches || []).length * 12;
            
            // Length bonus - longer selectors are generally more specific
            score += Math.floor(selector.length / 10);
            
            return score;
        }

        function findBestSelectorInContext(container, selectors) {
            const validSelectors = selectors
                .map(selector => {
                    try {
                        const elements = container.querySelectorAll(selector);
                        const count = elements.length;
                        const specificity = calculateSpecificity(selector);
                        
                        // Additional scoring for price-specific criteria
                        let priceScore = 0;
                        if (count > 0) {
                            // Check if elements actually contain price-like content
                            const hasNumericContent = Array.from(elements).some(el => {
                                const text = el.textContent || el.innerText || '';
                                return /[\d.,]+/.test(text);
                            });
                            priceScore = hasNumericContent ? 50 : 0;
                        }
                        
                        return {
                            selector,
                            count,
                            specificity,
                            priceScore,
                            // Combined score: prioritize specificity, add price relevance bonus
                            combinedScore: count > 0 ? (specificity * 1000) + count + priceScore : 0
                        };
                    } catch (error) {
                        console.warn(`Invalid selector: ${selector}`, error);
                        return {
                            selector,
                            count: 0,
                            specificity: 0,
                            priceScore: 0,
                            combinedScore: 0
                        };
                    }
                })
                .filter(item => item.count > 0);

            if (validSelectors.length === 0) {
                return null;
            }

            // Sort by combined score
            validSelectors.sort((a, b) => b.combinedScore - a.combinedScore);
            return validSelectors[0];
        }

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
            if (selector.includes('::shadow::')) {
                const [hostSelector, shadowSelector] = selector.split('::shadow::');
                return accessShadowElement(hostSelector.trim(), shadowSelector.trim());
            }
            return container.querySelector(selector);
        }

        // Enhanced query all function that can handle shadow DOM
        function queryAllElements(container, selector) {
            if (selector.includes('::shadow::')) {
                const [hostSelector, shadowSelector] = selector.split('::shadow::');
                const hostElement = document.querySelector(hostSelector.trim());
                if (hostElement && hostElement.shadowRoot) {
                    return Array.from(hostElement.shadowRoot.querySelectorAll(shadowSelector.trim()));
                }
                return [];
            }
            return Array.from(container.querySelectorAll(selector));
        }

        // New function to execute JavaScript expressions safely
        function executeJavaScriptSelector(jsExpression) {
            try {
                const cleanExpression = jsExpression.replace(/;$/, '');
                return eval(cleanExpression);
            } catch (error) {
                console.warn('Error executing JavaScript selector:', jsExpression, error);
                return null;
            }
        }

        // Enhanced function to get price elements with best selector logic
        function getPriceElementsWithBestSelector(container, selectors) {
            // Use findBestSelector to get the optimal selector for this container
            const bestSelectorInfo = findBestSelectorInContext(container, selectors);
            
            if (!bestSelectorInfo) {
                return { elements: [], bestSelector: null };
            }

            const bestSelector = bestSelectorInfo.selector;
            
            if (bestSelector.includes('document')) {
                // This is a JavaScript expression
                const result = executeJavaScriptSelector(bestSelector);
                if (result) {
                    if (typeof result === 'string') {
                        const fakeElement = document.createElement('span');
                        fakeElement.textContent = result;
                        fakeElement.innerText = result;
                        return { elements: [fakeElement], bestSelector };
                    }
                    if (result.nodeType) {
                        return { elements: [result], bestSelector };
                    }
                    if (result.length !== undefined) {
                        return { elements: Array.from(result), bestSelector };
                    }
                }
                return { elements: [], bestSelector };
            } else {
                // This is a CSS selector
                return { 
                    elements: queryAllElements(container, bestSelector), 
                    bestSelector 
                };
            }
        }

        // Clean price text function
        function cleanPriceText(text, attribute) {
            if (!text) return '';
            
            let cleaned = text.trim();
            
            // Remove common non-price text
            cleaned = cleaned.replace(/KDV\s+Dahil/gi, '');
            cleaned = cleaned.replace(/Vergiler\s+Dahil/gi, '');
            cleaned = cleaned.replace(/Tax\s+Included/gi, '');
            cleaned = cleaned.replace(/İndirimli\s+Fiyat/gi, '');
            cleaned = cleaned.replace(/Normal\s+Fiyat/gi, '');
            
            // Normalize whitespace
            cleaned = cleaned.replace(/\s+/g, ' ').trim();
            
            return cleaned;
        }

        // Use only the best selector to get candidate items
        const candidateItems = Array.from(document.querySelectorAll(params.productItemSelector)).map(m => {
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
                    break;
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
                    break;
                }
            }
            const linkElement = linkElementsWithSelectors[0]?.element || null;

            // Image elements matching with selector tracking
            const imgElementsWithSelectors = [];
            for (const sel of imageSelectors) {
                const elements = queryAllElements(m, sel);
                for (const element of elements) {
                    const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                    if (!alreadyExists) {
                        imgElementsWithSelectors.push({ element, selector: sel });
                    }
                }
            }
            const imgElements = imgElementsWithSelectors.map(item => item.element);
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

            // ENHANCED PRICE HANDLING WITH BEST SELECTOR
            const priceInfo = [];
            
            // Use the best selector approach for price extraction
            const { elements: priceElements, bestSelector: bestPriceSelector } = 
                getPriceElementsWithBestSelector(m, priceSelectors);

            console.log(`Best price selector for this item: ${bestPriceSelector}`);

            if (priceElements.length > 0) {
                const priceAttrList = params.priceAttribute;
                
                for (const priceEl of priceElements) {
                    const isJavaScript = bestPriceSelector && bestPriceSelector.includes('document');
                    
                    if (isJavaScript && typeof priceEl === 'object' && priceEl.textContent) {
                        const value = cleanPriceText(priceEl.textContent, 'textContent');
                        if (value && /[\d.,]+/.test(value)) {
                            priceInfo.push({
                                value,
                                selector: bestPriceSelector,
                                attribute: 'textContent',
                                isJavaScript: true
                            });
                        }
                    } else {
                        // For regular CSS selectors, prioritize textContent over innerText
                        const prioritizedAttrs = ['textContent', ...priceAttrList.filter(attr => attr !== 'textContent')];
                        
                        for (const attr of prioritizedAttrs) {
                            let value = priceEl[attr]?.trim();
                            if (value) {
                                value = cleanPriceText(value, attr);
                                
                                // Validate that we have something that looks like a price
                                if (value && /[\d.,]+/.test(value)) {
                                    priceInfo.push({
                                        value,
                                        selector: bestPriceSelector,
                                        attribute: attr,
                                        isJavaScript: false
                                    });
                                    break; // Take first valid price from this element
                                }
                            }
                        }
                    }
                }
            }

            // Video elements matching with selector tracking
            const videoElementsWithSelectors = [];
            for (const sel of videoSelectors) {
                const elements = queryAllElements(m, sel);
                for (const element of elements) {
                    const alreadyExists = videoElementsWithSelectors.some(item => item.element === element);
                    if (!alreadyExists) {
                        videoElementsWithSelectors.push({ element, selector: sel });
                    }
                }
            }
            const videoElements = videoElementsWithSelectors.map(item => item.element);
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

            const matchedSelector = params.productItemSelector

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
                        titleSelectorMatched,
                        imgSelectorMatched,
                        videoSelectorMatched,
                        bestPriceSelector, // Include the best price selector used
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

    // ... rest of your validData processing remains the same
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