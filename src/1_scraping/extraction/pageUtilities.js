// pageUtilities.js - Enhanced utility functions for page context injection

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

// Enhanced shadow DOM traversal function
function querySelectorAllDeep(rootElement, selector) {
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
    console.log('Best price selector found:', bestSelector, '(score:', bestSelectorInfo.combinedScore, ')');

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

// CONSOLIDATED TITLE OPERATIONS
function extractTitleInfo(container, titleSelectors, titleAttributes) {
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
}

// CONSOLIDATED IMAGE OPERATIONS
function extractImageInfo(container, imageSelectors, imageAttributes,imgExtToFilterOut) {
    console.group('🖼️ Image Extraction Process Started');
    console.log('Container:', container);
    console.log('Image Selectors Type:', typeof imageSelectors);
    console.log('Image Selectors Value:', imageSelectors);
    console.log('Image Attributes:', imageAttributes);
    
    const imgElementsWithSelectors = [];

    // Helper function to safely execute JavaScript code
    function executeJavaScript(jsCode, container) {
        console.group('🔧 Executing JavaScript Code');
        console.log('Code to execute:', jsCode);
        
        try {
            // Check if it's a function definition
            if (jsCode.trim().startsWith('function')) {
                console.log('✅ Detected: Function definition');
                // It's a function definition - evaluate it and then call it
                const func = new Function('container', 'document', `
                    try {
                        const userFunction = ${jsCode};
                        return userFunction(container);
                    } catch (error) {
                        console.error('Error executing function code:', error);
                        return null;
                    }
                `);
                
                const result = func(container, document);
                console.log('Function execution result:', result);
                console.groupEnd();
                return { type: 'function_result', value: result };
            } else {
                console.log('✅ Detected: JavaScript expression');
                // It's a JavaScript expression - wrap it in a function automatically
                const func = new Function('element', 'container', 'document', `
                    try {
                        return ${jsCode};
                    } catch (error) {
                        console.error('Error executing JS expression:', error);
                        return null;
                    }
                `);

                // Execute the wrapped expression with container as 'element'
                const result = func(container, container, document);
                console.log('Expression execution result:', result);
                
                // Handle different result types
                if (result) {
                    if (typeof result === 'string' && result.trim()) {
                        console.log('✅ Result type: Single URL string');
                        console.groupEnd();
                        return { type: 'url', value: result.trim() };
                    } else if (Array.isArray(result)) {
                        console.log('✅ Result type: Array with', result.length, 'items');
                        if (result.length > 0) {
                            if (typeof result[0] === 'string') {
                                console.log('✅ Array contains: URL strings');
                                console.groupEnd();
                                return { type: 'urls', value: result.filter(url => url && url.trim()) };
                            } else if (result[0] && result[0].nodeType) {
                                console.log('✅ Array contains: DOM elements');
                                console.groupEnd();
                                return { type: 'elements', value: result };
                            }
                        }
                        console.log('⚠️ Array is empty or contains unknown types');
                        console.groupEnd();
                        return { type: 'empty', value: [] };
                    } else if (result.length !== undefined) {
                        console.log('✅ Result type: Array-like (NodeList) with', result.length, 'items');
                        console.groupEnd();
                        return { type: 'elements', value: Array.from(result) };
                    } else if (result && result.nodeType) {
                        console.log('✅ Result type: Single DOM element');
                        console.groupEnd();
                        return { type: 'elements', value: [result] };
                    }
                }
                console.log('⚠️ Result is null, undefined, or unrecognized type');
                console.groupEnd();
                return { type: 'empty', value: [] };
            }
        } catch (error) {
            console.error('❌ JavaScript execution failed:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            console.groupEnd();
            return { type: 'empty', value: [] };
        }
    }

    // Find all image elements using selectors or JavaScript code
    const directUrls = []; // Store URLs from JavaScript execution

    console.group('🎯 Processing Image Selectors');

    if (typeof imageSelectors === 'function') {
        console.log('✅ Selection Method: Function');
        // Function - call it with the container element
        try {
            console.log('Executing function for image selection:', imageSelectors.name || 'anonymous function');
            const result = imageSelectors(container);
            const actualSelector = `Function: ${imageSelectors.name || 'anonymous'}`;
            console.log('Function result:', result);

            if (result) {
                if (typeof result === 'string' && result.trim()) {
                    console.log('✅ Function returned single URL:', result.trim());
                    directUrls.push({ url: result.trim(), selector: actualSelector });
                } else if (Array.isArray(result)) {
                    console.log('✅ Function returned array with', result.length, 'items');
                    if (result.length > 0) {
                        if (typeof result[0] === 'string') {
                            console.log('✅ Array contains URL strings');
                            const validUrls = result.filter(url => url && url.trim());
                            console.log('Valid URLs found:', validUrls.length);
                            for (const url of validUrls) {
                                directUrls.push({ url: url.trim(), selector: actualSelector });
                            }
                        } else if (result[0].nodeType) {
                            console.log('✅ Array contains DOM elements');
                            for (const element of result) {
                                const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                                if (!alreadyExists) {
                                    imgElementsWithSelectors.push({ element, selector: actualSelector });
                                } else {
                                    console.log('⚠️ Element already exists, skipping duplicate');
                                }
                            }
                        }
                    } else {
                        console.log('⚠️ Function returned empty array');
                    }
                } else if (result.length !== undefined) {
                    console.log('✅ Function returned NodeList with', result.length, 'items');
                    const elements = Array.from(result);
                    for (const element of elements) {
                        const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                        if (!alreadyExists) {
                            imgElementsWithSelectors.push({ element, selector: actualSelector });
                        } else {
                            console.log('⚠️ Element already exists, skipping duplicate');
                        }
                    }
                } else if (result.nodeType) {
                    console.log('✅ Function returned single DOM element');
                    const alreadyExists = imgElementsWithSelectors.some(item => item.element === result);
                    if (!alreadyExists) {
                        imgElementsWithSelectors.push({ element: result, selector: actualSelector });
                    } else {
                        console.log('⚠️ Element already exists, skipping duplicate');
                    }
                }
            } else {
                console.log('⚠️ Function returned null/undefined result');
            }
        } catch (error) {
            console.error('❌ Function execution failed:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
    } else if (typeof imageSelectors === 'string') {
        console.log('✅ Selection Method: JavaScript String');
        // String - could be JavaScript code, function definition, or expression
        console.log('Executing JavaScript code/expression for image selection:', imageSelectors);
        const jsResult = executeJavaScript(imageSelectors, container);
        const actualSelector = `JavaScript: ${imageSelectors.substring(0, 50)}${imageSelectors.length > 50 ? '...' : ''}`;

        console.log('JavaScript execution result type:', jsResult.type);
        console.log('JavaScript execution result value:', jsResult.value);

        if (jsResult.type === 'url' || jsResult.type === 'function_result') {
            if (typeof jsResult.value === 'string' && jsResult.value.trim()) {
                console.log('✅ JavaScript returned single URL:', jsResult.value.trim());
                directUrls.push({ url: jsResult.value.trim(), selector: actualSelector });
            } else if (Array.isArray(jsResult.value)) {
                console.log('✅ JavaScript returned array of URLs, count:', jsResult.value.length);
                const validUrls = jsResult.value.filter(url => url && url.trim());
                console.log('Valid URLs from array:', validUrls.length);
                for (const url of validUrls) {
                    directUrls.push({ url: url.trim(), selector: actualSelector });
                }
            }
        } else if (jsResult.type === 'urls') {
            console.log('✅ JavaScript returned URL array, count:', jsResult.value.length);
            for (const url of jsResult.value) {
                directUrls.push({ url, selector: actualSelector });
            }
        } else if (jsResult.type === 'elements') {
            console.log('✅ JavaScript returned DOM elements, count:', jsResult.value.length);
            for (const element of jsResult.value) {
                const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                if (!alreadyExists) {
                    imgElementsWithSelectors.push({ element, selector: actualSelector });
                } else {
                    console.log('⚠️ Element already exists, skipping duplicate');
                }
            }
        } else if (jsResult.type === 'empty') {
            console.log('⚠️ JavaScript returned no results');
        }
    } else if (Array.isArray(imageSelectors)) {
        console.log('✅ Selection Method: CSS Selectors Array');
        console.log('Number of CSS selectors:', imageSelectors.length);
        
        // Array - treat as CSS selectors
        for (let i = 0; i < imageSelectors.length; i++) {
            const selector = imageSelectors[i];
            console.group(`🎯 Processing CSS Selector ${i + 1}/${imageSelectors.length}: "${selector}"`);
            
            try {
                const elements = Array.from(container.querySelectorAll(selector));
                console.log('Elements found:', elements.length);
                
                if (elements.length === 0) {
                    console.log('❌ No elements found for selector:', selector);
                    console.log('Container has children:', container.children.length);
                    console.log('Container tag name:', container.tagName);
                } else {
                    console.log('✅ Found elements:', elements.map(el => ({
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        src: el.src,
                        'data-src': el.getAttribute('data-src')
                    })));
                }
                
                for (const element of elements) {
                    const alreadyExists = imgElementsWithSelectors.some(item => item.element === element);
                    if (!alreadyExists) {
                        imgElementsWithSelectors.push({ element, selector });
                    } else {
                        console.log('⚠️ Element already exists, skipping duplicate');
                    }
                }
            } catch (error) {
                console.error(`❌ CSS Selector error for "${selector}":`, error);
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    selector: selector,
                    containerValid: container && container.querySelectorAll ? 'yes' : 'no'
                });
            }
            console.groupEnd();
        }
    } else {
        console.error('❌ Invalid imageSelectors type:', typeof imageSelectors);
        console.error('Expected: function, string (JavaScript), or array (CSS selectors)');
        console.groupEnd();
        console.groupEnd();
        return {
            imgElements: [],
            imgSelectorMatched: null,
            imgUrls: [],
            primaryImg: null,
            error: 'Invalid imageSelectors type'
        };
    }

    console.groupEnd(); // End Processing Image Selectors

    const imgElements = imgElementsWithSelectors.map(item => item.element);
    const imgSelectorMatched = imgElementsWithSelectors[0]?.selector || directUrls[0]?.selector || null;

    console.group('📊 Results Summary');
    console.log('Total DOM elements found:', imgElements.length);
    console.log('Total direct URLs found:', directUrls.length);
    console.log('Selector that matched:', imgSelectorMatched);
    console.groupEnd();

    // Extract image URLs from attributes
    console.group('🔍 Extracting URLs from Attributes');
    console.log('Attributes to check:', imageAttributes);
    
    const imgUrls = imgElements.flatMap((el, index) => {
        console.group(`Element ${index + 1}/${imgElements.length}`);
        console.log('Element:', el.tagName, el.className, el.id);
        
        const urls = imageAttributes
            .map(attr => {
                const cleanAttr = attr?.replaceAll(" ", "");
                const value = el?.getAttribute(cleanAttr);
                console.log(`Attribute "${cleanAttr}":`, value || 'not found');
                return value;
            })
            .filter(Boolean);
            
        console.log('URLs found from attributes:', urls);
        console.groupEnd();
        return urls;
    });

    console.log('All URLs from attributes:', imgUrls);
    console.groupEnd();

    // Add URLs from direct JavaScript execution
    const directUrlValues = directUrls.map(item => item.url);
    console.log('Direct URLs from JavaScript execution:', directUrlValues);

    // Extract background image URLs
    console.group('🎨 Extracting Background Images');
    function getBackgroundImageUrl(el) {
        const bgImage = el?.style?.backgroundImage;
        const urlMatch = bgImage?.match(/url\(["']?(.*?)["']?\)/);
        const result = urlMatch ? urlMatch[1] : null;
        console.log('Element background image:', bgImage, '-> extracted:', result);
        return result;
    }

    const bgImgs = imgElements
        .map(el => getBackgroundImageUrl(el))
        .filter(Boolean);
        
    console.log('Background image URLs found:', bgImgs);
    console.groupEnd();

    // Define stop words for irrelevant URLs
    const imageStopWords = [
         'placeholder','load.gif','hebebedundefined','loader.gif',
        // 'loading', 'spinner', 'loader', 'blank', 'empty',
        // 'icon', 'logo', 'sprite', 'thumbnail', 'thumb', 'avatar',
        // 'banner', 'header', 'footer', 'background', 'bg',
        // 'watermark', 'overlay', 'mask', 'pattern',
        'sample', 'demo', 'test', 'example', 'default','lazy','base64','data:image/','a570a12d-981c-4878-b476-526687bbc0a4'
    ];

    console.group('🧹 Filtering URLs');
    const allImgsBeforeFilter = [...new Set([...imgUrls, ...directUrlValues, ...bgImgs])];
    console.log('All URLs before filtering:', allImgsBeforeFilter);
    console.log('Stop words for filtering:', imageStopWords);

    const allImgs = allImgsBeforeFilter
        .filter((image) => {
            console.group(`Filtering URL: ${image}`);

            // 1. Filter by extension if imgExtToFilterOut is provided
            if (imgExtToFilterOut && imgExtToFilterOut.length > 0) {
                // Normalize extensions: remove leading dots and escape for regex.
                const extensions = imgExtToFilterOut.map(ext => 
                    ext.replace(/^\./, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                );
                const regex = new RegExp(`\\.(${extensions.join('|')})(\\?.*)?$`, 'i');
                if (regex.test(image)) {
                    console.log(`URL blocked by extension filter (${extensions.join(', ')}).`);
                    console.groupEnd();
                    return false; // Exclude if it matches a blocked extension
                }
            }

            // 2. Filter by stop words
            const imageLower = image.toLowerCase();
            const hasStopWord = imageStopWords.some(stopWord => {
                const includes = imageLower.includes(stopWord.toLowerCase());
                if (includes) {
                    console.log(`URL contains stop word: "${stopWord}"`);
                }
                return includes;
            });

            if (hasStopWord) {
                console.log('URL blocked by stop word filter.');
                console.groupEnd();
                return false; // Exclude if it contains a stop word
            }

            console.log('URL passed all filters.');
            console.groupEnd();
            return true; // Keep the URL
        });

    console.log('URLs after filtering:', allImgs);
    console.groupEnd();

    // Pick the first valid image as primary
    const primaryImg = allImgs.length > 0 ? allImgs[0] : null;
    console.log('Primary image selected:', primaryImg);

    const result = {
        imgElements,
        imgSelectorMatched,
        imgUrls: allImgs,
        primaryImg
    };

    console.group('📋 Final Results');
    console.log('Image elements found:', result.imgElements.length);
    console.log('Selector that matched:', result.imgSelectorMatched);
    console.log('Image URLs:', result.imgUrls);
    console.log('Primary image:', result.primaryImg);
    console.groupEnd();

    console.groupEnd(); // End main group
    
    return result;
}

// CONSOLIDATED LINK OPERATIONS
function extractLinkInfo(container, linkSelectors) {
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
}

// CONSOLIDATED VIDEO OPERATIONS
function extractVideoInfo(container, videoSelectors, videoAttributes) {
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
}

// CONSOLIDATED PRICE OPERATIONS
function extractPriceInfo(container, priceSelectors, priceAttributes) {
    const priceInfo = [];

    // Use the enhanced shadow DOM-aware price extraction
    const { elements: priceElements, bestSelector: bestPriceSelector } =
        getPriceElementsWithBestSelector(container, priceSelectors);

    console.log('Best price selector for this item:', bestPriceSelector);

    if (priceElements.length > 0) {
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
                const prioritizedAttrs = ['textContent', ...priceAttributes.filter(attr => attr !== 'textContent')];

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

    return {
        priceInfo,
        bestPriceSelector,
        hasShadowDOMPrice: priceInfo.some(p => p.isShadowDOM)
    };
}

// Function to inject all utilities into window scope
function injectPageUtilities() {
    window.calculateSpecificity = calculateSpecificity;
    window.executeJavaScriptSelector = executeJavaScriptSelector;
    window.querySelectorShadowDOM = querySelectorShadowDOM;
    window.executeJavaScriptShadowSelector = executeJavaScriptShadowSelector;
    window.querySelectorAllDeep = querySelectorAllDeep;
    window.findBestSelectorInContext = findBestSelectorInContext;
    window.getPriceElementsWithBestSelector = getPriceElementsWithBestSelector;
    window.cleanPriceText = cleanPriceText;
    window.extractTitleInfo = extractTitleInfo;
    window.extractImageInfo = extractImageInfo;
    window.extractLinkInfo = extractLinkInfo;
    window.extractVideoInfo = extractVideoInfo;
    window.extractPriceInfo = extractPriceInfo;
}

// Auto-inject when used in browser context
if (typeof window !== 'undefined') {
    injectPageUtilities();
}

// Export for Node.js usage
export {
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
    extractPriceInfo,
    injectPageUtilities
};