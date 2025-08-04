


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
export default async function first({ page, addRequests, siteUrls }) {

    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
    });

    console.log('inside first route')


    const shouldContinue = await continueIfProductPage({ page, siteUrls });
    if (shouldContinue) {
        await addNextPagesToRequests({ page, addRequests, siteUrls });
        return await scrapeData({ page, siteUrls })
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
        const baseRowData = {
            Site: site,
            'Total Objects': 0,
            'Invalid Titles': 0,
            'Invalid Page Titles': 0,
            'Invalid Links': 0,
            'Invalid Images': 0,
            'Invalid Prices': 0,
            'Unset Prices': 0,
            'Price Scrape Errors': 0,
            'Product Not Available': 0,
            'Total Unique Objects (by link)': 0,
            'Error Objects': 0,
            "JSONErrorGit": 'N/A',
            "JSONErrorDrive": 'N/A',
            "JSONDataGit": 'N/A',
            "JSONDataDrive": 'N/A',
            'Start Time': 0,
            'End Time': 0,
            'Span (min)': 0,
            'Total Pages': 0,
            'Unique Page URLs': 0,
            'AutoScroll': '',
            'productItemSelector': 'N/A',
            'ScreenshotGit': result.url

        };
        await emitAsync('log-to-sheet', {
            sheetTitle: 'Crawl Logs(success)',
            message: console.log(`Site ${site} is logging data to Google Sheet.`),
            rowData: baseRowData
        });
        return []
    }

}