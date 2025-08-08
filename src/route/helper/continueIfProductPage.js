import dotenv from "dotenv";
import scroller, { autoScroll, scrollWithShowMoreAdvanced } from "../../scrape-helpers/scroller.js";
import productPageSelector from "../../selector-attibutes/productPageSelector.js";

dotenv.config({ silent: true }); export default async function continueIfProductPage({ page, siteUrls }) {

    debugger
    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });

    const scrollBehavior = siteUrls?.scrollBehavior;
    const waitForSeconds = siteUrls?.waitForSeconds || 3;
    debugger
    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1000)); // Fixed: multiply by 1000 for milliseconds
        }, waitForSeconds);
    }
    const productItemsCount = await page.$$eval(productPageSelector.join(', '), elements => elements.length);
    debugger
    if (productItemsCount > 0) {
        if (waitForSeconds > 0) {
            await page.evaluate(async (seconds) => {
                await new Promise(resolve => setTimeout(resolve, seconds * 1000)); // Fixed: multiply by 1000 for milliseconds
            }, waitForSeconds);
        }

        // Handle different scrollBehavior formats
        if (Array.isArray(scrollBehavior)) {
            if (scrollBehavior.length === 2) {
                // Format: ['css selector', true/false]
                const [selector, shouldScroll] = scrollBehavior;

                if (typeof selector === 'string' && typeof shouldScroll === 'boolean') {
                    console.log(`Running advanced scroll with selector: ${selector}, scrolling: ${shouldScroll}`);
                    await scrollWithShowMoreAdvanced(page, 500, selector, {
                        waitAfterClick: 3000,
                        maxConsecutiveBottomReached: 3,
                        enableScrolling: shouldScroll
                    });
                }
            } else if (scrollBehavior.length === 1 && scrollBehavior[0] === true) {
                // Format: [true]
                console.log('Running basic auto scroll');
                await autoScroll(page, 150);
            }
        } else if (scrollBehavior === '' || !scrollBehavior) {
            // No scrolling
            console.log('No scrolling configured');
        }

        return true;
    } else {
        debugger
        console.log('No product items found on the page');
        return false;
    }
}