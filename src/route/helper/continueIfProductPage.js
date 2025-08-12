import dotenv from "dotenv";
import scroller, { autoScroll, scrollWithShowMoreAdvanced, autoScrollUntilCount } from "../../scrape-helpers/scroller.js";
import productPageSelector from "../../selector-attibutes/productPageSelector.js";
import productItemSelector from "../../selector-attibutes/productItemSelector.js";
dotenv.config({ silent: true }); export default async function continueIfProductPage({ page, siteUrls }) {

    debugger
    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });

    const scrollBehavior = siteUrls?.scrollBehavior;
    const waitForSeconds = siteUrls?.waitForSeconds || 3;

    const paginationSelector = siteUrls?.paginationSelector;
    const scrollable = siteUrls?.scrollable || false;
    const showMoreButtonSelector = siteUrls?.showMoreButtonSelector || '';
    const totalProductCounterSelector = siteUrls?.totalProductCounterSelector || '';

    debugger
    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1000)); // Fixed: multiply by 1000 for milliseconds
        }, waitForSeconds);
    }
    const productItemsCount = await page.$$eval(productPageSelector.join(', '), elements => elements.length);
    debugger
    if (productItemsCount > 0) {

        debugger


        debugger
        if (scrollable && !showMoreButtonSelector && !totalProductCounterSelector) {

            debugger
            console.log('scroller', 'autoScroll--------------------')
            await autoScroll(page, {
                scrollSpeed: 500,
                scrollDistance: 300,
                waitForNetworkIdle: 1500,
                maxScrollAttempts: 500,
                enableLogging: true
            });
        } else if (scrollable && !showMoreButtonSelector && totalProductCounterSelector) {

            const matchedSelectors = [];
            const elementCounts = {};

            for (const selector of productItemSelector) {
                const count = await page.$$eval(selector, elements => elements.length);
                if (count > 0) {
                    matchedSelectors.push(selector);
                    elementCounts[selector] = count;
                }
            }
            debugger;
            console.log('scroller', 'autoScrollUntilCount--------------------')
            await autoScrollUntilCount(page, matchedSelectors[0], elementCounts[matchedSelectors[0]])


        } else if (scrollable && showMoreButtonSelector && totalProductCounterSelector) {
            console.log('scroller', 'scrollWithShowMoreAdvanced--------------------')
            await scrollWithShowMoreAdvanced(page, 500, showMoreButtonSelector, {
                waitAfterClick: 3000,
                maxConsecutiveBottomReached: 3,
                enableScrolling: shouldScroll
            });
        }

        // Handle different scrollBehavior formats
        if (false) {
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
                await autoScroll(page, {
                    scrollSpeed: 500,
                    scrollDistance: 300,
                    waitForNetworkIdle: 1500,
                    maxScrollAttempts: 500,
                    enableLogging: true
                });
            }
        }

        return true;
    } else {
        debugger
        console.log('No product items found on the page');
        return false;
    }
}