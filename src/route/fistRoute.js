


import dotenv from "dotenv";
import urls from '../meta/urls.json' assert { type: 'json' };
import { uploadToGoogleDrive } from '../sheet/uploadToGoogleDrive.js';
import getMainDomainPart from "../scrape-helpers/getMainDomainPart.js";
import scrapeData from "./helper/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";
import addInitialPagesToRequests from "./helper/addInitialPagesToRequests.js";
dotenv.config({ silent: true });

const site = process.env.site;
const siteUrls = urls.find(f => getMainDomainPart(f.urls[0]) === site)
const womanBags = ["kadin-canta",
    //  "kadin-cuzdan", "valiz-modelleri", "seyahat", "canta-155", "canta-aksesuar", "canta","bags","aksesuar"

]
export default async function first({ page, addRequests }) {

    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
    });

    // take screenshot and upload to google drive
    // const screenshotBuffer = await page.screenshot({ fullPage: true });

    // const uploadResult = await uploadToGoogleDrive({
    //     buffer: screenshotBuffer,
    //     fileName: `screenshot-${site}-${Date.now()}.png`,
    //     folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    //     serviceAccountCredentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')),
    // });

    // console.log('📸 Screenshot uploaded:', uploadResult.webViewLink);



    console.log('inside first route')
    await addInitialPagesToRequests({ page, addRequests });
    await addNextPagesToRequests({ page, addRequests });

    const data = await scrapeData({ page })

    return data


}