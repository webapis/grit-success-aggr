import dotenv from "dotenv";
import productItemSelector from "../../selector-attibutes/productItemSelector.js";
import findBestSelector from "../micro/findBestSelector.js";
import { uploadImage } from "../../git/uploadImage.js";
import getTotalItemsCount from "../micro/getTotalItemsCount.js";
import logToLocalSheet from "../../sheet/logToLocalSheet.js";

dotenv.config({ silent: true });
const site = process.env.site;

export default async function continueIfProductPage({ page, siteUrls }) {
    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });

    const bestSelector = await findBestSelector(page, productItemSelector);
    const { totalItemsToBeCallected, debug } = logToLocalSheet() || {};
    if (bestSelector.count > 0) {
        // Safely extract with default 0

        const previousTotalItemsToBeCallected = totalItemsToBeCallected || 0;
        debugger
        const { count: totalItemsToBeCallectedCount, selector: totalItemsSelector } =
            await getTotalItemsCount(page, siteUrls?.totalProductCounterSelector);
        debugger
        logToLocalSheet({
            totalItemsToBeCallected: totalItemsToBeCallectedCount + previousTotalItemsToBeCallected,
            totalItemsSelector
        });

        const totalItemsPerPage = bestSelector['count'];
        logToLocalSheet({ totalItemsPerPage });
        logToLocalSheet({ productItemSelector: bestSelector.selector });
        console.log('totalItemsToBeCallected--', totalItemsToBeCallected)
        return true;
    } else {
        if (debug) {
            // Take screenshot if initial pages could not be retrieved.
            const screenshotBuffer = await page.screenshot({ fullPage: true });

            // Upload directly to GitHub
            const result = await uploadImage({
                fileName: `${site}-${Date.now()}.png`,
                imageBuffer: screenshotBuffer,
                gitFolder: 'screenshots'
            });

            logToLocalSheet({ totalItemsPerPage: 0 });
            logToLocalSheet({ productItemSelector: 'not defined' });
            logToLocalSheet({ ScreenshotGit: result.url });
        }


        return false;
    }
}
