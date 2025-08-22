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

dotenv.config({ silent: true });

// Updated scrapeData function with utility functions injected into page context
export default async function scrapeData({ page, siteUrls, productItemSelector }) {
    debugger

    // Inject utility functions directly into the page context
    await page.addScriptTag({
        content: `
            // Enhanced calculateSpecificity function
            window.calculateSpecificity = function(selector) {
                let score = 0;
                
                // Shadow DOM selectors get highest priority
                if (selector.includes('::shadow') || selector.includes('shadowRoot')) {
                    score += 2000; // Very high bonus for shadow DOM selectors
                }
                
                // Count IDs (#id, [id*=], [id^=], etc.)
                const idMatches = selector.match(/#[\\w-]+|\\[id[\\*\\^$~|]?=/g);
                score += (idMatches || []).length * 100;
                
                // Count classes (.class), attributes ([attr]), and pseudo-classes (:pseudo)
                const classMatches = selector.match(/\\.[\\w-]+|\\[[\\w-]+[\\*\\^$~|]?=|\\:[\\w-]+(?:\\([^)]*\\))?/g);
                score += (classMatches || []).length * 10;
                
                // Count elements (div, span, article, etc.)
                const elementMatches = selector.match(/(?:^|[\\s>+~])([a-zA-Z][\\w-]*)/g);
                score += (elementMatches || []).length * 1;
                
                // Bonus for descendant combinators (spaces)
                const descendantMatches = selector.match(/\\s+(?![>+~])/g);
                score += (descendantMatches || []).length * 5;
                
                // Bonus for direct child combinators (>)
                const childMatches = selector.match(/>/g);
                score += (childMatches || []).length * 3;
                
                // Bonus for negation selectors (:not())
                const notMatches = selector.match(/:not\\([^)]+\\)/g);
                score += (notMatches || []).length * 8;
                
                // Bonus for :has() selectors
                const hasMatches = selector.match(/:has\\([^)]+\\)/g);
                score += (hasMatches || []).length * 12;
                
                // Length bonus
                score += Math.floor(selector.length / 10);
                
                return score;
            };

            // Enhanced executeJavaScriptSelector function
            window.executeJavaScriptSelector = function(jsExpression) {
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
            };

            // Function to handle CSS shadow DOM selectors (::shadow syntax)
            window.querySelectorShadowDOM = function(rootElement, selector) {
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
            };

            // Function to handle JavaScript shadow DOM selectors
            window.executeJavaScriptShadowSelector = function(rootElement, selector) {
                try {
                    const cleanExpression = selector.replace(/;$/, '');
                    
                    // Handle expressions like: document.querySelector("price-element").shadowRoot.querySelector(".price")
                    const shadowMatch = cleanExpression.match(/document\\.querySelector\\(['"]([^'"]+)['"]\\)\\.shadowRoot\\.querySelector\\(['"]([^'"]+)['"]\\)/);
                    
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
                    const shadowMatchAll = cleanExpression.match(/document\\.querySelector\\(['"]([^'"]+)['"]\\)\\.shadowRoot\\.querySelectorAll\\(['"]([^'"]+)['"]\\)/);
                    
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
                    return window.executeJavaScriptSelector(cleanExpression);
                } catch (error) {
                    console.warn('Error executing shadow DOM JS selector:', selector, error);
                    return [];
                }
            };

            // Enhanced shadow DOM traversal function
            window.querySelectorAllDeep = function(rootElement, selector) {
                // Handle shadow DOM selectors
                if (selector.includes('::shadow')) {
                    try {
                        return window.querySelectorShadowDOM(rootElement, selector);
                    } catch (error) {
                        console.warn('Shadow DOM CSS selector failed:', selector, error);
                        return [];
                    }
                }
                
                // Handle JavaScript shadow DOM selectors
                if (selector.includes('shadowRoot')) {
                    try {
                        return window.executeJavaScriptShadowSelector(rootElement, selector);
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
            };

            // Enhanced findBestSelectorInContext function
            window.findBestSelectorInContext = function(container, selectors) {
                const validSelectors = selectors
                    .map(selector => {
                        try {
                            const elements = window.querySelectorAllDeep(container, selector);
                            const count = elements.length;
                            const specificity = window.calculateSpecificity(selector);
                            
                            // Additional scoring for price-specific criteria
                            let priceScore = 0;
                            if (count > 0) {
                                // Check if elements actually contain price-like content
                                const hasNumericContent = elements.some(el => {
                                    const text = el.textContent || el.innerText || '';
                                    return /[\\d.,]+/.test(text);
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
                            console.warn('Invalid selector:', selector, error);
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
            };

            // Enhanced function to get price elements with shadow DOM support
            window.getPriceElementsWithBestSelector = function(container, selectors) {
                // Use findBestSelector to get the optimal selector for this container
                const bestSelectorInfo = window.findBestSelectorInContext(container, selectors);
                
                if (!bestSelectorInfo) {
                    return { elements: [], bestSelector: null };
                }

                const bestSelector = bestSelectorInfo.selector;
                
                // Log the best selector found for debugging
                console.log('Best price selector found:', bestSelector, '(score:', bestSelectorInfo.combinedScore, ')');
                
                return { 
                    elements: bestSelectorInfo.elements, 
                    bestSelector 
                };
            };

            // Clean price text function
            window.cleanPriceText = function(text, attribute) {
                if (!text) return '';
                
                let cleaned = text.trim();
                
                // Remove common non-price text
                cleaned = cleaned.replace(/KDV\\s+Dahil/gi, '');
                cleaned = cleaned.replace(/Vergiler\\s+Dahil/gi, '');
                cleaned = cleaned.replace(/Tax\\s+Included/gi, '');
                cleaned = cleaned.replace(/İndirimli\\s+Fiyat/gi, '');
                cleaned = cleaned.replace(/Normal\\s+Fiyat/gi, '');
                
                // Normalize whitespace
                cleaned = cleaned.replace(/\\s+/g, ' ').trim();
                
                return cleaned;
            };

            // CONSOLIDATED TITLE OPERATIONS
            window.extractTitleInfo = function(container, titleSelectors, titleAttributes) {
                let titleElement = null;
                let titleSelectorMatched = null;
                let title = null;
                let linkFromTitle = null;
                
                // Find title element using selectors
                for (const selector of titleSelectors) {
                    const element = container.querySelector(selector);
                    if (element) {
                        titleElement = element;
                        titleSelectorMatched = selector;
                        break;
                    }
                }
                
                // Extract title text from element
                if (titleElement) {
                    title = titleAttributes
                        .map(attr => titleElement[attr?.replaceAll(" ", "")])
                        .find(Boolean);
                    
                    // Extract link from title element if it has href
                    if (titleElement.href) {
                        linkFromTitle = titleElement.href;
                    }
                }
                
                return {
                    titleElement,
                    titleSelectorMatched,
                    title,
                    linkFromTitle
                };
            };

            // CONSOLIDATED IMAGE OPERATIONS
            window.extractImageInfo = function(container, imageSelectors, imageAttributes) {
                const imgElementsWithSelectors = [];
                
                // Find all image elements using selectors
                for (const selector of imageSelectors) {
                    const elements = Array.from(container.querySelectorAll(selector));
                    for (const element of elements) {
                        const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                        if (!alreadyExists) {
                            imgElementsWithSelectors.push({ element, selector });
                        }
                    }
                }
                
                const imgElements = imgElementsWithSelectors.map(item => item.element);
                const imgSelectorMatched = imgElementsWithSelectors[0]?.selector || null;
                
                // Extract image URLs from attributes
                const imgUrls = imgElements.flatMap(el =>
                    imageAttributes
                        .map(attr => el?.getAttribute(attr?.replaceAll(" ", "")))
                        .filter(Boolean)
                );
                
                // Extract background image URLs
                function getBackgroundImageUrl(el) {
                    const bgImage = el?.style.backgroundImage;
                    const urlMatch = bgImage?.match(/url\\(["']?(.*?)["']?\\)/);
                    return urlMatch ? urlMatch[1] : null;
                }
                
                const bgImgs = imgElements
                    .map(el => getBackgroundImageUrl(el))
                    .filter(Boolean);
                
                const allImgs = [...new Set([...imgUrls, ...bgImgs])];
                const primaryImg = allImgs[0] || null;
                
                return {
                    imgElements,
                    imgSelectorMatched,
                    imgUrls: allImgs,
                    primaryImg
                };
            };

            // CONSOLIDATED LINK OPERATIONS
            window.extractLinkInfo = function(container, linkSelectors) {
                const linkElementsWithSelectors = [];
                
                // Find link elements using selectors
                for (const selector of linkSelectors) {
                    const element = container.querySelector(selector);
                    if (element) {
                        linkElementsWithSelectors.push({ element, selector });
                        break;
                    }
                }
                
                const linkElement = linkElementsWithSelectors[0]?.element || null;
                const linkSelectorMatched = linkElementsWithSelectors[0]?.selector || null;
                
                return {
                    linkElement,
                    linkSelectorMatched
                };
            };

            // CONSOLIDATED VIDEO OPERATIONS
            window.extractVideoInfo = function(container, videoSelectors, videoAttributes) {
                const videoElementsWithSelectors = [];
                
                // Find video elements using selectors
                for (const selector of videoSelectors) {
                    const elements = Array.from(container.querySelectorAll(selector));
                    for (const element of elements) {
                        const alreadyExists = videoElementsWithSelectors.some(item => item.element === element);
                        if (!alreadyExists) {
                            videoElementsWithSelectors.push({ element, selector });
                        }
                    }
                }
                
                const videoElements = videoElementsWithSelectors.map(item => item.element);
                const videoSelectorMatched = videoElementsWithSelectors[0]?.selector || null;
                
                // Extract video URLs from attributes
                const videoUrls = videoElements
                    .flatMap(el =>
                        videoAttributes
                            .map(attr => el?.getAttribute(attr))
                            .filter(Boolean)
                    );
                
                const allVideos = [...new Set(videoUrls)];
                
                return {
                    videoElements,
                    videoSelectorMatched,
                    videoUrls: allVideos
                };
            };

            // CONSOLIDATED PRICE OPERATIONS
            window.extractPriceInfo = function(container, priceSelectors, priceAttributes) {
                const priceInfo = [];
                
                // Use the enhanced shadow DOM-aware price extraction
                const { elements: priceElements, bestSelector: bestPriceSelector } = 
                    window.getPriceElementsWithBestSelector(container, priceSelectors);

                console.log('Best price selector for this item:', bestPriceSelector);

                if (priceElements.length > 0) {
                    for (const priceEl of priceElements) {
                        const isJavaScript = bestPriceSelector && 
                            (bestPriceSelector.includes('document') || bestPriceSelector.includes('shadowRoot'));
                        
                        if (isJavaScript && typeof priceEl === 'object' && priceEl.textContent) {
                            const value = window.cleanPriceText(priceEl.textContent, 'textContent');
                            if (value && /[\\d.,]+/.test(value)) {
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
                            const prioritizedAttrs = ['textContent', ...priceAttributes.filter(attr => attr !== 'textContent')];
                            
                            for (const attr of prioritizedAttrs) {
                                let value = priceEl[attr]?.trim();
                                if (value) {
                                    value = window.cleanPriceText(value, attr);
                                    
                                    // Validate that we have something that looks like a price
                                    if (value && /[\\d.,]+/.test(value)) {
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
                
                return {
                    priceInfo,
                    bestPriceSelector,
                    hasShadowDOMPrice: priceInfo.some(p => p.isShadowDOM)
                };
            };
        `
    });

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