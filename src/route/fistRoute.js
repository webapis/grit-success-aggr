


import dotenv from "dotenv";
import { uploadToGoogleDrive } from '../sheet/uploadToGoogleDrive.js';
import scrapeData from "./helper/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";
import continueIfProductPage from "./helper/continueIfProductPage.js";
import { uploadImage } from "../git/uploadImage.js";
import { emitAsync } from "../events.js";
import '../listeners.js'; // ← This registers event handlers
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
    'ScreenshotGit': result.url

};
export default async function first({ page, addRequests, siteUrls }) {

    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
    });

    console.log('inside first route')

    debugger
    const shouldContinue = await continueIfProductPage({ page, siteUrls });
    if (shouldContinue) {
        debugger
        await addNextPagesToRequests({ page, addRequests, siteUrls });
        debugger
        const data = await scrapeData({ page, siteUrls })
        if (data.length === 0) {

            await emitAsync('log-to-sheet', {
                sheetTitle: 'Crawl Logs(success)',
                message: console.log(`Site ${site} is logging data to Google Sheet.`),
                rowData: { ...baseRowData, Notes: 'no productItemSelector is provided :firstRoute' }
            });
        }
        debugger
        return data
    } else {
        //take screenshot if initial pages could not be retrieved.
        const screenshotBuffer = await page.screenshot({ fullPage: true });

        // const uploadResult = await uploadToGoogleDrive({
        //     buffer: screenshotBuffer,
        //     fileName: `screenshot-${site}-${Date.now()}.png`,
        //     folderId: process.env.GOOGLE_DRIVE_FOLDER_ID_SNAPSHOT,
        //     serviceAccountCredentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')),
        // });
        // console.log('📸 Screenshot uploaded:', uploadResult.webViewLink);

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
            rowData: baseRowData
        });
        return []
    }

}