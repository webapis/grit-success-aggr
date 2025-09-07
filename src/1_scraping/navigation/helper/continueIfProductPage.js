import dotenv from "dotenv";
import productItemSelector from "../../../config/selectors/selector-attibutes/productItemSelector.js";
import findBestSelector from "../micro/findBestSelector.js";
import { uploadImage } from "../../../shared/git/uploadImage.js";
import getTotalItemsCount from "../micro/getTotalItemsCount.js";
import logToLocalSheet from "../../../2_data/persistence/sheet/logToLocalSheet.js";

dotenv.config({ silent: true });
const site = process.env.site;

export default async function continueIfProductPage({ page, siteUrls }) {
    page.on("console", (message) => {
        //  console.log("Message from Puppeteer page:", message.text());
    });
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    await delay(5000); // wait for 5 seconds
    const bestSelector = await findBestSelector(page, productItemSelector);
    debugger
    const { totalItemsToBeCallected, debug } = logToLocalSheet() || {};
    if (bestSelector.count > 0) {
        // Safely extract with default 0

        const previousTotalItemsToBeCallected = totalItemsToBeCallected || 0;

        const { count: totalItemsToBeCallectedCount, selector: totalItemsSelector } =
            await getTotalItemsCount(page, siteUrls?.totalProductCounterSelector);

        logToLocalSheet({
            totalItemsToBeCallected: totalItemsToBeCallectedCount + previousTotalItemsToBeCallected,
            totalItemsSelector
        });

        const totalItemsPerPage = bestSelector['count'];
        logToLocalSheet({ totalItemsPerPage });

        logToLocalSheet({ productItemSelector: bestSelector.selector });
        // console.log('totalItemsToBeCallected--', totalItemsToBeCallected)

        if (debug) {
            // Take screenshot if initial pages could not be retrieved.
            const screenshotBuffer = await page.screenshot({ fullPage: true });

            // Upload directly to GitHub
            const result = await uploadImage({
                fileName: `${site}-${Date.now()}.png`,
                imageBuffer: screenshotBuffer,
                gitFolder: 'screenshots'
            });


            logToLocalSheet({ ScreenshotGit: result.url });
        }

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

            logToLocalSheet({ ScreenshotGit: result.url });
        }

        logToLocalSheet({ totalItemsPerPage: 0 });
        logToLocalSheet({ productItemSelector: 'not defined' });

        return false;
    }
}
