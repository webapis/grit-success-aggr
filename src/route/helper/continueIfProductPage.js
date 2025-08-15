import dotenv from "dotenv";
import productPageSelector from "../../selector-attibutes/productPageSelector.js";
import productItemSelector from "../../selector-attibutes/productItemSelector.js";
import { emitAsync } from "../../events.js";
import { uploadImage } from "../../git/uploadImage.js";
import '../../listeners.js'; // ← This registers event handlers
 dotenv.config({ silent: true });
const site = process.env.site;
// 
let baseRowData = {
    Site: site,
    'Notes': 'firstRoute shouldContinue is false look into screenshots',
    'Total Objects': 'Not Reached',
    'Invalid Titles': 'Not Reached',
    'Invalid Page Titles': 'Not Reached',
    'Invalid Links': 'Not Reached',
    'Invalid Images': 'Not Reached',
    'Invalid Prices': 'Not Reached',
    'Unset Prices': 'Not Reached',
    'Price Scrape Errors': 'Not Reached',
    'Product Not Available': 'Not Reached',
    'Total Unique Objects (by link)': 'Not Reached',
    'Error Objects': 'Not Reached',
    "JSONErrorGit": 'Not Reached',
    "JSONErrorDrive": 'Not Reached',
    "JSONDataGit": 'Not Reached',
    "JSONDataDrive": 'Not Reached',
    'Start Time': 'Not Reached',
    'End Time': 'Not Reached',
    'Span (min)': 'Not Reached',
    'Total Pages': 'Not Reached',
    'Unique Page URLs': 'Not Reached',
    'AutoScroll': 'Not Reached',
    'productPageSelector': 'Not Reached',
    'productItemSelector': 'Not Reached',
    'ScreenshotGit': 'Not Reached'

};

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
    const productItemsCount = await page.$$eval(productItemSelector.join(', '), elements => elements.length);
    console.log('Product items count:==================================================', productItemsCount);
    debugger
    if (productItemsCount > 0) {

        return true;
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
            rowData: { ...baseRowData, ScreenshotGit: result.url, Notes: 'continueIfProductPage.js > productItemsCount === 0', }
        });
        console.log('No product items found on the page');
        return false;
    }
}