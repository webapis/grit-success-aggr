import dotenv from "dotenv";
import productItemSelector from "../../selector-attibutes/productItemSelector.js";
import findBestSelector from "../micro/findBestSelector.js";
import { uploadImage } from "../../git/uploadImage.js";
import getTotalItemsCount from "../micro/getTotalItemsCount.js";
import logToLocalSheet from "../../sheet/logToLocalSheet.js";

dotenv.config({ silent: true });
const site = process.env.site;

export default async function continueIfProductPage({ page, siteUrls }) {

    debugger
    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });


    const waitForSeconds = siteUrls?.waitForSeconds || 3;


    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1000)); // Fixed: multiply by 1000 for milliseconds
        }, waitForSeconds);
    }

    const bestSelector = await findBestSelector(page, productItemSelector);

    debugger

    if (bestSelector.count > 0) {

        const { count: totalItemsToBeCallected, selector: totalItemsSelector } = await getTotalItemsCount(page, siteUrls?.totalProductCounterSelector);


        logToLocalSheet({ totalItemsToBeCallected, totalItemsSelector });



        const totalItemsPerPage = bestSelector['count'];

        logToLocalSheet({ totalItemsPerPage });
        logToLocalSheet({ productItemSelector: bestSelector.selector });

        return true

    } else {
        //take screenshot if initial pages could not be retrieved.
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        // Upload directly to GitHub
        const result = await uploadImage({
            fileName: `${site}-${Date.now()}.png`,  // Will become 'webpage-screenshot.png'
            imageBuffer: screenshotBuffer,   // Pass the buffer directly
            gitFolder: 'screenshots'
        })

        logToLocalSheet({ totalItemsPerPage: 0 });
        logToLocalSheet({ productItemSelector: 'not defined' });
        logToLocalSheet({ ScreenshotGit: result.url });

        return false
    }
}