import itemCounterSelector from "../../selector-attibutes/itemCounterSelector.js";
import uploadScreenShot from "./uploadScreenShot.js";
export default async function getTotalItemsCount(page, totalProductCounterSelector) {
    let selector = null;
    const TIMEOUT = 10000; // 10 second timeout
    
    try {
     

        // Handle special cases first
        if (totalProductCounterSelector === 'none') {
            return { count: 0, selector: 'none', success: true };
        }

        // Determine selector to use
        const selectorToUse = totalProductCounterSelector || itemCounterSelector;
        selector = selectorToUse;

        // Input validation
        if (!selector) {
            console.warn('No selector provided');
            return { count: 0, selector: 'No selector provided', success: false };
        }

        // Check if totalProductCounterSelector is JavaScript code (contains common JS patterns)
        const isJavaScriptCode = typeof selector === 'string' && (
            selector.includes('document.querySelector') ||
            selector.includes('document.querySelectorAll') ||
            selector.includes('.innerText') ||
            selector.includes('.textContent') ||
            selector.includes('.split(') ||
            selector.includes('.filter(')
        );

        if (isJavaScriptCode) {
            return await executeJavaScriptSelector(page, selector);
        }

        // Handle array of selectors
        if (Array.isArray(selector)) {
            selector = await findFirstValidSelector(page, selector);
            if (!selector) {
            //    console.warn('No valid selector found from array:', selectorToUse);
                return { 
                    count: 0, 
                    selector: 'No valid selector found from array', 
                    success: false 
                };
            }
        }

        // Wait for element with timeout
        try {
            await page.waitForSelector(selector, { timeout: TIMEOUT });
        } catch (timeoutError) {
            console.warn(`Selector not found within ${TIMEOUT}ms:`, selector);
            await uploadScreenShot({ page, fileNamePrefix: 'getTotalItemsCount' });
            return { 
                count: 0, 
                selector: `Timeout waiting for selector: ${selector}`, 
                success: false 
            };
        }

        // Get element text content
        const resultElement = await page.$eval(selector, el => el.textContent?.trim() || '');

        if (!resultElement) {
            console.warn('Element found but has no text content');
            return { 
                count: 0, 
                selector: `Element found but has no text content: ${selector}`, 
                success: false 
            };
        }

        // Extract number from text
        const extractedCount = extractNumberFromText(resultElement);
        
        if (extractedCount === null) {
            console.warn('No numbers found in element text:', resultElement);
            return { 
                count: 0, 
                selector: `No numbers found in element text: ${selector}`, 
                success: false 
            };
        }

  
        return { count: extractedCount, selector, success: true };

    } catch (error) {
        console.error('Error getting total items count:', error.message);
        console.error('Selector used:', selector || 'undefined');
        return { 
            count: 0, 
            selector: `Error: ${error.message} (selector: ${selector || 'undefined'})`, 
            success: false 
        };
    }
}

// Helper function to safely execute JavaScript selectors with whitelist approach
async function executeJavaScriptSelector(page, jsCode) {
    try {
        console.log('Executing JavaScript code:', jsCode);

        // Whitelist of allowed operations for security
        const allowedPatterns = [
            /document\.querySelector\(['"`][^'"`]*['"`]\)/g,
            /document\.querySelectorAll\(['"`][^'"`]*['"`]\)/g,
            /\.innerText/g,
            /\.textContent/g,
            /\.split\(['"`][^'"`]*['"`]\)/g,
            /\.filter\(/g,
            /\.trim\(\)/g,
            /\.length/g,
            /\[[\d]+\]/g
        ];

        // Basic security check - ensure code only contains whitelisted patterns
        const sanitizedCode = jsCode.replace(/\s+/g, ' ').trim();
        let isSecure = false;
        
        for (const pattern of allowedPatterns) {
            if (pattern.test(sanitizedCode)) {
                isSecure = true;
                break;
            }
        }

        if (!isSecure) {
            console.warn('JavaScript code contains non-whitelisted operations:', jsCode);
            return { 
                count: 0, 
                selector: `Unsafe JavaScript code rejected: ${jsCode}`, 
                success: false 
            };
        }

        // Execute the JavaScript code in the browser context
        const result = await page.evaluate((code) => {
            try {
                // Safer evaluation using eval with limited scope
                return eval(code);
            } catch (error) {
                console.error('Error executing JS code:', error);
                return null;
            }
        }, jsCode);

        if (result !== null && result !== undefined) {
            const count = parseInt(String(result), 10);
            if (!isNaN(count) && count >= 0) {
                return { 
                    count, 
                    selector: `JavaScript: ${jsCode}`, 
                    success: true 
                };
            }
        }

        console.warn('JavaScript execution returned invalid result:', result);
        return { 
            count: 0, 
            selector: `JavaScript execution returned invalid result: ${jsCode}`, 
            success: false 
        };

    } catch (error) {
        console.error('Error executing JavaScript code:', error);
        return { 
            count: 0, 
            selector: `JavaScript execution error: ${error.message}`, 
            success: false 
        };
    }
}

// Helper function to find first valid selector from array
async function findFirstValidSelector(page, selectorArray) {
    for (const s of selectorArray) {
        try {
            const exists = await page.$(s);
            if (exists) {
                return s;
            }
        } catch (error) {
            // Invalid selector, continue to next one
            console.warn('Invalid selector in array:', s, error.message);
        }
    }
    return null;
}

// Helper function to extract number from text
function extractNumberFromText(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }

    // Clean text and extract numbers
    const numbers = text
        .replace(/[()]/g, ' ')  // Replace parentheses with spaces
        .trim()
        .split(/\s+/)          // Split by whitespace
        .map(part => {
            // Extract numbers from each part
            const match = part.match(/\d+/);
            return match ? parseInt(match[0], 10) : null;
        })
        .filter(num => num !== null && !isNaN(num) && num >= 0);

    return numbers.length > 0 ? numbers[0] : null;
}