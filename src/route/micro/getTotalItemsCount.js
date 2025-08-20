import itemCounterSelector from "../../selector-attibutes/itemCounterSelector.js";
import findBestSelector from "./findBestSelector.js";

export default async function getTotalItemsCount(page) {
    debugger
    const result = await findBestSelector(page, itemCounterSelector);
    debugger
    
    const { selector } = result;
    debugger
    
    // Check if a valid selector was found
    if (!selector) {
        console.warn('No valid item counter selector found on the page');
        console.warn('Available selectors were:', itemCounterSelector);
        console.warn('Error:', result.error);
        return null; // or return 0, or throw an error based on your needs
    }
    
    try {
        // Optional: Wait for selector to be available
        // await page.waitForSelector(selector, { timeout: 5000 });
        
        debugger
        const resultElement = await page.$eval(selector, el => el.textContent);
        
        if (!resultElement) {
            console.warn('Element found but has no text content');
            return null;
        }
        
        const number = resultElement.trim().split(" ").filter(f => Number(f));
        
        console.log('getTotalItemsCount', number);
        debugger
        
        // Additional validation
        if (number.length === 0) {
            console.warn('No numbers found in element text:', resultElement);
            return null;
        }
        
        return parseInt(number[0], 10); // Use parseInt to ensure we return a number
        
    } catch (error) {
        console.error('Error getting total items count:', error);
        console.error('Selector used:', selector);
        
        // You might want to return null, 0, or rethrow the error
        // depending on how you want to handle this case
        return null;
    }
}