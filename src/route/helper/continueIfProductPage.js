import dotenv from "dotenv";
import scroller, { autoScroll } from "../../scrape-helpers/scroller.js";
import productPageSelector from "../../selector-attibutes/productPageSelector.js";

dotenv.config({ silent: true });


export default async function continueIfProductPage({ page, siteUrls }) {

    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });

    const isAutoScroll = siteUrls?.isAutoScroll || false;
    const waitForSeconds = siteUrls?.waitForSeconds || 0
    const productItemsCount = await page.$$eval(productPageSelector.join(', '), elements => elements.length);
    if (productItemsCount > 0) {

        if (waitForSeconds > 0) {
            await page.evaluate(async (seconds) => {
                await new Promise(resolve => setTimeout(resolve, seconds * 1)); // Wait for specified seconds
            }, waitForSeconds);
        }

        if (isAutoScroll) {
            console.log('autoscrolling')
            await autoScroll(page, 150)
        } else {
            //  await scroller(page, 150, 5);
        }
        return true;
    } else {
        console.log('No product items found on the page');
        return false;
    }


}