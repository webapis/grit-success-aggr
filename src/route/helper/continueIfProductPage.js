import dotenv from "dotenv";
import productPageSelector from "../../selector-attibutes/productPageSelector.js";
import productItemSelector from "../../selector-attibutes/productItemSelector.js";

import { emitAsync } from "../../events.js";
import { uploadImage } from "../../git/uploadImage.js";
import '../../listeners.js'; // ← This registers event handlers
import { pushDataToDataset } from "../../crawlee/datasetOperations.js";
import getMatchedSelector from "../micro/getMatchedSelector.js";
import getTotalItemsCount from "../micro/getTotalItemsCount.js";
import baseRowData from "../micro/baseRowData.js";
dotenv.config({ silent: true });
const site = process.env.site;

export default async function continueIfProductPage({ page, siteUrls }) {

    debugger
    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });


    const waitForSeconds = siteUrls?.waitForSeconds || 3;

    debugger
    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1000)); // Fixed: multiply by 1000 for milliseconds
        }, waitForSeconds);
    }
    debugger
    const { matchedSelectors: matchedproductItemSelectors, elementCounts: totalItemsPerPage } = await getMatchedSelector({ page, selector: productItemSelector });
    const { matchedSelectors: matchedPageSelectors, elementCounts: totalPageContainer } = await getMatchedSelector({ page, selector: productPageSelector });

    debugger
    if (matchedproductItemSelectors.length > 0 && matchedPageSelectors.length > 0) {
        debugger
        try {
            if (siteUrls?.totalProductCounterSelector) {
                debugger
                const totalItemsToBeCallected = await getTotalItemsCount(page, siteUrls.totalProductCounterSelector);

                if (totalItemsToBeCallected > 0) {
                    await pushDataToDataset('totalItemsToBeCallected', { totalItemsToBeCallected });
                }
            }

            await pushDataToDataset('totalItemsPerPage', { totalItemsPerPage: totalItemsPerPage[matchedproductItemSelectors[0]] });
            await pushDataToDataset("matchedproductItemSelectors", { matchedproductItemSelectors });
            return { success: true, productItemSelector: matchedproductItemSelectors, productPageSelector: matchedPageSelectors, totalItemsPerPage, totalPageContainer };
        } catch (error) {
            debugger
        }
        debugger

    } else {
        //take screenshot if initial pages could not be retrieved.
        const screenshotBuffer = await page.screenshot({ fullPage: true });


        // Upload directly to GitHub
        const result = await uploadImage({
            fileName: `${site}-${Date.now()}.png`,  // Will become 'webpage-screenshot.png'
            imageBuffer: screenshotBuffer,   // Pass the buffer directly
            gitFolder: 'screenshots'
        })
        console.log('Screenshot uploaded!')
        console.log('View at:', result.url)
        console.log('Direct link:', result.downloadUrl)

        await emitAsync('log-to-sheet', {
            sheetTitle: 'Crawl Logs(success)',
            message: console.log(`Site ${site} is logging data to Google Sheet.`),
            rowData: { ...baseRowData,Site:site, ScreenshotGit: result.url, Notes: `continueIfProductPage.js >`, productItemSelector: matchedproductItemSelectors.join(','), productPageSelector: matchedPageSelectors.join(',') }
        });
        console.log('No product items found on the page');
        return { success: false, productItemSelector: matchedproductItemSelectors, productPageSelector: matchedPageSelectors, totalItemsPerPage, totalPageContainer };
    }
}