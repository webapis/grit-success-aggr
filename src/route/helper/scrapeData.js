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

// Updated scrapeData function with enhanced shadow DOM support
export default async function scrapeData({ page, siteUrls, productItemSelector }) {
    debugger

    const data = await page.evaluate((params) => {
        const pageTitle = document.title;
        const pageURL = document.URL;

        // Enhanced calculateSpecificity function
        function calculateSpecificity(selector) {
            let score = 0;
            
            // Shadow DOM selectors get highest priority
            if (selector.includes('::shadow') || selector.includes('shadowRoot')) {
                score += 2000; // Very high bonus for shadow DOM selectors
            }
            
            // Count IDs (#id, [id*=], [id^=], etc.)
            const idMatches = selector.match(/#[\w-]+|\[id[\*\^$~|]?=/g);
            score += (idMatches || []).length * 100;
            
            // Count classes (.class), attributes ([attr]), and pseudo-classes (:pseudo)
            const classMatches = selector.match(/\.[\w-]+|\[[\w-]+[\*\^$~|]?=|\:[\w-]+(?:\([^)]*\))?/g);
            score += (classMatches || []).length * 10;
            
            // Count elements (div, span, article, etc.)
            const elementMatches = selector.match(/(?:^|[\s>+~])([a-zA-Z][\w-]*)/g);
            score += (elementMatches || []).length * 1;
            
            // Bonus for descendant combinators (spaces)
            const descendantMatches = selector.match(/\s+(?![>+~])/g);
            score += (descendantMatches || []).length * 5;
            
            // Bonus for direct child combinators (>)
            const childMatches = selector.match(/>/g);
            score += (childMatches || []).length * 3;
            
            // Bonus for negation selectors (:not())
            const notMatches = selector.match(/:not\([^)]+\)/g);
            score += (notMatches || []).length * 8;
            
            // Bonus for :has() selectors
            const hasMatches = selector.match(/:has\([^)]+\)/g);
            score += (hasMatches || []).length * 12;
            
            // Length bonus
            score += Math.floor(selector.length / 10);
            
            return score;
        }

        // Enhanced shadow DOM traversal function
        function querySelectorAllDeep(rootElement, selector) {
            const elements = [];
            
            // Handle shadow DOM selectors
            if (selector.includes('::shadow')) {
                try {
                    return querySelectorShadowDOM(rootElement, selector);
                } catch (error) {
                    console.warn('Shadow DOM CSS selector failed:', selector, error);
                    return [];
                }
            }
            
            // Handle JavaScript shadow DOM selectors
            if (selector.includes('shadowRoot')) {
                try {
                    return executeJavaScriptShadowSelector(rootElement, selector);
                } catch (error) {
                    console.warn('Shadow DOM JS selector failed:', selector, error);
                    return [];
                }
            }
            
            // Regular CSS selector
            try {
                return Array.from(rootElement.querySelectorAll(selector));
            } catch (error) {
                console.warn('Regular selector failed:', selector, error);
                return [];
            }
        }
        
        // Function to handle CSS shadow DOM selectors (::shadow syntax)
        function querySelectorShadowDOM(rootElement, selector) {
            const elements = [];
            
            if (selector.includes('::shadow::')) {
                // Format: 'price-element::shadow::.price-container .price'
                const parts = selector.split('::shadow::');
                const hostSelector = parts[0].trim();
                const shadowSelector = parts[1].trim();
                
                // Search in root element first, then in document if not found
                let hostElements = Array.from(rootElement.querySelectorAll(hostSelector));
                if (hostElements.length === 0 && rootElement !== document) {
                    hostElements = Array.from(document.querySelectorAll(hostSelector));
                }
                
                for (const host of hostElements) {
                    if (host.shadowRoot) {
                        try {
                            const shadowElements = Array.from(host.shadowRoot.querySelectorAll(shadowSelector));
                            elements.push(...shadowElements);
                        } catch (error) {
                            console.warn('Shadow selector failed:', shadowSelector, error);
                        }
                    }
                }
            }
            
            return elements;
        }
        
        // Function to handle JavaScript shadow DOM selectors
        function executeJavaScriptShadowSelector(rootElement, selector) {
            try {
                const cleanExpression = selector.replace(/;$/, '');
                
                // Handle expressions like: document.querySelector("price-element").shadowRoot.querySelector(".price")
                const shadowMatch = cleanExpression.match(/document\.querySelector\(['"]([^'"]+)['"]\)\.shadowRoot\.querySelector\(['"]([^'"]+)['"]\)/);
                
                if (shadowMatch) {
                    const hostSelector = shadowMatch[1];
                    const shadowSelector = shadowMatch[2];
                    
                    // Try to find in current container first, then document
                    let hostElement = rootElement.querySelector ? rootElement.querySelector(hostSelector) : null;
                    if (!hostElement) {
                        hostElement = document.querySelector(hostSelector);
                    }
                    
                    if (hostElement && hostElement.shadowRoot) {
                        const result = hostElement.shadowRoot.querySelector(shadowSelector);
                        return result ? [result] : [];
                    }
                    return [];
                }
                
                // Handle querySelectorAll variants
                const shadowMatchAll = cleanExpression.match(/document\.querySelector\(['"]([^'"]+)['"]\)\.shadowRoot\.querySelectorAll\(['"]([^'"]+)['"]\)/);
                
                if (shadowMatchAll) {
                    const hostSelector = shadowMatchAll[1];
                    const shadowSelector = shadowMatchAll[2];
                    
                    let hostElement = rootElement.querySelector ? rootElement.querySelector(hostSelector) : null;
                    if (!hostElement) {
                        hostElement = document.querySelector(hostSelector);
                    }
                    
                    if (hostElement && hostElement.shadowRoot) {
                        return Array.from(hostElement.shadowRoot.querySelectorAll(shadowSelector));
                    }
                    return [];
                }
                
                // Fallback to regular eval for other JavaScript expressions
                return executeJavaScriptSelector(cleanExpression);
            } catch (error) {
                console.warn('Error executing shadow DOM JS selector:', selector, error);
                return [];
            }
        }

        // Enhanced executeJavaScriptSelector function
        function executeJavaScriptSelector(jsExpression) {
            try {
                const cleanExpression = jsExpression.replace(/;$/, '');
                const result = eval(cleanExpression);
                
                if (result) {
                    if (typeof result === 'string') {
                        // Create fake element for string results
                        const fakeElement = document.createElement('span');
                        fakeElement.textContent = result;
                        fakeElement.innerText = result;
                        return [fakeElement];
                    }
                    if (result.nodeType) {
                        return [result];
                    }
                    if (result.length !== undefined) {
                        return Array.from(result);
                    }
                }
                return [];
            } catch (error) {
                console.warn('Error executing JavaScript selector:', jsExpression, error);
                return [];
            }
        }

        // Enhanced findBestSelectorInContext function
        function findBestSelectorInContext(container, selectors) {
            const validSelectors = selectors
                .map(selector => {
                    try {
                        const elements = querySelectorAllDeep(container, selector);
                        const count = elements.length;
                        const specificity = calculateSpecificity(selector);
                        
                        // Additional scoring for price-specific criteria
                        let priceScore = 0;
                        if (count > 0) {
                            // Check if elements actually contain price-like content
                            const hasNumericContent = elements.some(el => {
                                const text = el.textContent || el.innerText || '';
                                return /[\d.,]+/.test(text);
                            });
                            priceScore = hasNumericContent ? 100 : 0;
                            
                            // Bonus for currency symbols
                            const hasCurrency = elements.some(el => {
                                const text = el.textContent || el.innerText || '';
                                return /[₺$€£¥]/.test(text);
                            });
                            priceScore += hasCurrency ? 50 : 0;
                        }
                        
                        return {
                            selector,
                            elements,
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
                            elements: [],
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

        // Enhanced function to get price elements with shadow DOM support
        function getPriceElementsWithBestSelector(container, selectors) {
            // Use findBestSelector to get the optimal selector for this container
            const bestSelectorInfo = findBestSelectorInContext(container, selectors);
            
            if (!bestSelectorInfo) {
                return { elements: [], bestSelector: null };
            }

            const bestSelector = bestSelectorInfo.selector;
            
            // Log the best selector found for debugging
            console.log(`Best price selector found: ${bestSelector} (score: ${bestSelectorInfo.combinedScore})`);
            
            return { 
                elements: bestSelectorInfo.elements, 
                bestSelector 
            };
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
                const element = m.querySelector(sel);
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
                const element = m.querySelector(sel);
                if (element) {
                    linkElementsWithSelectors.push({ element, selector: sel });
                    break;
                }
            }
            const linkElement = linkElementsWithSelectors[0]?.element || null;

            // Image elements matching with selector tracking
            const imgElementsWithSelectors = [];
            for (const sel of imageSelectors) {
                const elements = Array.from(m.querySelectorAll(sel));
                for (const element of elements) {
                    const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                    if (!alreadyExists) {
                        imgElementsWithSelectors.push({ element, selector: sel });
                    }
                }
            }
            const imgElements = imgElementsWithSelectors.map(item => item.element);
            const imgSelectorMatched = imgElementsWithSelectors[0]?.selector || null;

            const productNotInStock = m.querySelector(params.productNotAvailable.join(', ')) ? true : false;

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

            // ENHANCED PRICE HANDLING WITH SHADOW DOM SUPPORT
            const priceInfo = [];
            
            // Use the enhanced shadow DOM-aware price extraction
            const { elements: priceElements, bestSelector: bestPriceSelector } = 
                getPriceElementsWithBestSelector(m, priceSelectors);

            console.log(`Best price selector for this item: ${bestPriceSelector}`);

            if (priceElements.length > 0) {
                const priceAttrList = params.priceAttribute;
                
                for (const priceEl of priceElements) {
                    const isJavaScript = bestPriceSelector && 
                        (bestPriceSelector.includes('document') || bestPriceSelector.includes('shadowRoot'));
                    
                    if (isJavaScript && typeof priceEl === 'object' && priceEl.textContent) {
                        const value = cleanPriceText(priceEl.textContent, 'textContent');
                        if (value && /[\d.,]+/.test(value)) {
                            priceInfo.push({
                                value,
                                selector: bestPriceSelector,
                                attribute: 'textContent',
                                isJavaScript: true,
                                isShadowDOM: bestPriceSelector.includes('shadowRoot') || bestPriceSelector.includes('::shadow')
                            });
                        }
                    } else {
                        // For regular CSS selectors and shadow DOM elements
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
                                        isJavaScript: false,
                                        isShadowDOM: bestPriceSelector && (bestPriceSelector.includes('shadowRoot') || bestPriceSelector.includes('::shadow'))
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
                const elements = Array.from(m.querySelectorAll(sel));
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
                        bestPriceSelector,
                        priceExtractedFromShadowDOM: priceInfo.some(p => p.isShadowDOM)
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

    // Process and validate the scraped data
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