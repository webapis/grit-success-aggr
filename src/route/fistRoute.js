


import dotenv from "dotenv";
import { createPuppeteerRouter, Dataset } from "crawlee";
import { uploadToGoogleDrive } from '../sheet/uploadToGoogleDrive.js';
import scrapeData from "./helper/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";
import continueIfProductPage from "./helper/continueIfProductPage.js";
import { emitAsync } from "../events.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import '../listeners.js'; // ← This registers event handlers

import { uploadImage } from "../git/uploadImage.js";

dotenv.config({ silent: true });

const site = process.env.site;

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
export default async function first(props) {
    const { page, addRequests, siteUrls, request: { url } } = props
    debugger
    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
    });

    console.log('inside first route')

    debugger
    const { success, productItemSelector, productPageSelector } = await continueIfProductPage({ page, siteUrls });
    if (success) {

        debugger
        await scrollPageIfRequired(page, siteUrls)
        await addNextPagesToRequests({ page, addRequests, siteUrls, url });
        debugger
        const data = await scrapeData({ page, siteUrls, productItemSelector })

        if (data.length === 0) {

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
                rowData: { ...baseRowData, Notes: 'fistRoute.js > data.length ===0', ScreenshotGit: result.url, 'productItemSelector': productItemSelector,'productPageSelector':productPageSelector }
            });

            debugger
            return data
        }
    } else {

        return []
    }

}