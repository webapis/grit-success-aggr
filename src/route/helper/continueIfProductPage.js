import dotenv from "dotenv";
import scroller, { autoScroll, scrollWithShowMoreAdvanced } from "../../scrape-helpers/scroller.js";
import productPageSelector from "../../selector-attibutes/productPageSelector.js";

dotenv.config({ silent: true });

export default async function continueIfProductPage({ page, siteUrls }) {

    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });

    const isAutoScroll = siteUrls?.isAutoScroll || false;
    const waitForSeconds = siteUrls?.waitForSeconds || 0;
    
    const productItemsCount = await page.$$eval(productPageSelector.join(', '), elements => elements.length);
    
    if (productItemsCount > 0) {
        if (waitForSeconds > 0) {
            await page.evaluate(async (seconds) => {
                await new Promise(resolve => setTimeout(resolve, seconds * 1)); // Wait for specified seconds
            }, waitForSeconds);
        }

        // Handle different types for isAutoScroll
        if (typeof isAutoScroll === 'boolean'&& isAutoScroll === true) {
            debugger
            console.log('Running basic auto scroll');
            await autoScroll(page, 150);
        } else if (typeof isAutoScroll === 'string') {
            debugger
            console.log('Running advanced scroll with selector:', isAutoScroll);
            await scrollWithShowMoreAdvanced(page, 500, isAutoScroll, {
                waitAfterClick: 3000, // Wait 3 seconds after clicking
                maxConsecutiveBottomReached: 3 // Stop after 3 attempts with no button
            });
        }
        
        return true;
    } else {
        console.log('No product items found on the page');
        return false;
    }
}