import dotenv from "dotenv";
import scroller, { autoScroll, scrollWithShowMoreAdvanced, autoScrollUntilCount, scrollWithShowMoreUntilCount } from "../../scrape-helpers/scroller.js";
import productItemSelector from "../../selector-attibutes/productItemSelector.js";
dotenv.config({ silent: true });

export async function scrollPageIfRequired({ page, siteUrls, routeName }) {

    console.log('inside scrollPageIfRequired', routeName)
    const scrollable = siteUrls?.scrollable || false;
    const showMoreButtonSelector = siteUrls?.showMoreButtonSelector || '';
    // const totalProductCounterSelector = siteUrls?.totalProductCounterSelector || '';
    console.log('is scrollable', siteUrls?.scrollable)

    if (scrollable && showMoreButtonSelector) {
        console.log('scroller', 'autoScroll---showMoreButtonSelector-----------------')
        await scrollWithShowMoreAdvanced(page, 1000, showMoreButtonSelector, {
            debug: true,
            waitAfterClick: 2500,
            maxClicks: 5
        });
    } else if (scrollable) {
        debugger
        console.log('scroller', 'autoScroll--------------------')
        await autoScroll(page, {
            scrollSpeed: 500,
            scrollDistance: 300,
            waitForNetworkIdle: 1500,
            maxScrollAttempts: 500,
            enableLogging: true
        });
    } else {
        console.log('No scrolling is required--------------------------------------------------')
    }
    //}
    // } else if (scrollable && !showMoreButtonSelector && totalProductCounterSelector) {

    //     const matchedSelectors = [];
    //     const elementCounts = {};

    //     for (const selector of productItemSelector) {
    //         const count = await page.$$eval(selector, elements => elements.length);
    //         if (count > 0) {
    //             matchedSelectors.push(selector);
    //             elementCounts[selector] = count;
    //         }
    //     }

    //     const totalItemsToBeCallected = await page.evaluate((totalProductCounterSelector) => {
    //         const totalCountText = document.querySelector(totalProductCounterSelector)?.innerText || '';
    //         const totalCount = parseInt(totalCountText.replace(/\D/g, ''), 10);
    //         return totalCount

    //     }, totalProductCounterSelector)

    //     const targetElementSelector = matchedSelectors[0];
    //     debugger;
    //     console.log('scroller', 'autoScrollUntilCount--------------------')
    //     await autoScrollUntilCount(page, targetElementSelector, totalItemsToBeCallected, {
    //         enableLogging: true,

    //     })


    // } else if (scrollable && showMoreButtonSelector && totalProductCounterSelector) {
    //     console.log('scroller', 'scrollWithShowMoreUntilCount--------------------')

    //     const totalItemsToBeCallected = await page.evaluate((totalProductCounterSelector) => {
    //         const totalCountText = document.querySelector(totalProductCounterSelector)?.innerText || '';
    //         const totalCount = parseInt(totalCountText.replace(/\D/g, ''), 10);
    //         return totalCount

    //     }, totalProductCounterSelector)
    //     debugger;
    //     const matchedSelectors = [];
    //     const elementCounts = {};

    //     for (const selector of productItemSelector) {
    //         const count = await page.$$eval(selector, elements => elements.length);
    //         if (count > 0) {
    //             matchedSelectors.push(selector);
    //             elementCounts[selector] = count;
    //         }
    //     }
    //     const targetElementSelector = matchedSelectors[0];
    //     debugger
    //     await scrollWithShowMoreUntilCount(
    //         page,
    //         targetElementSelector,        // Elements to count
    //         totalItemsToBeCallected,                     // Target: 50 products
    //         showMoreButtonSelector       // Show more button selector
    //     );
    //     debugger
    // } else if (scrollable && showMoreButtonSelector && !totalProductCounterSelector) {
    //     await scrollWithShowMoreAdvanced(page, 500, showMoreButtonSelector, {
    //         waitAfterClick: 3000,
    //         maxConsecutiveBottomReached: 3,
    //         enableScrolling: true
    //     });
    // } else if (!scrollable && showMoreButtonSelector && !totalProductCounterSelector) {
    //     await scrollWithShowMoreAdvanced(page, 500, showMoreButtonSelector, {
    //         waitAfterClick: 3000,
    //         maxConsecutiveBottomReached: 3,
    //         enableScrolling: false
    //     });






}