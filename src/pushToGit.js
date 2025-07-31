import { Readable } from 'stream';
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import { Dataset } from 'crawlee';
import getAggrTimeSpan from "./sheet/getAggrTimeSpan.js";
import countUnique from "./sheet/countUnique.js";
import countByField from "./scrape-helpers/countByField.js";
import getUniquePageURLs from "./sheet/getUniquePageURLs.js";
import getMainDomainPart from "./helper/getMainDomainPart.js";
import { emitAsync } from "./events.js";
import './listeners.js'; // ← This registers event handlers
import urls from './meta/urls.json' assert { type: 'json' };
import uploadJSONToGoogleDrive from "./drive/uploadJSONToGoogleDrive.js";
dotenv.config({ silent: true });

const URL_CATEGORIES = process.env.URL_CATEGORIES;
const site = process.env.site;
const siteUrls = urls.find(f => getMainDomainPart(f.urls[0]) === site)
const dataset = await Dataset.open(site);
const { items: data } = await dataset.getData();

const dataWithoutError = data.filter(f => !f.error);
const dataWithError = data.filter(f => f.error);
const { oldestTimestamp, newestTimestamp, minutesSpan } = getAggrTimeSpan({ data });
const totalPages = countUnique({ data, key: 'pageURL' });
const totalUniqueObjects = countUnique({ data, key: 'link' });
const validLinks = countByField(data, 'linkValid');
const validimgs = countByField(data, 'imgValid');
const validTitle = countByField(data, 'titleValid');
const validPageTitle = countByField(data, 'pageTitleValid');
const validPrice = countByField(data, 'priceValid');
const unsetPrice = countByField(data, 'priceisUnset', true);
const priceScrapeError = countByField(data, 'priceScrapeError', true);
const totalNotAvailable = countByField(data, 'productNotInStock', true);
debugger


const uniquePageURLs = getUniquePageURLs({ data: dataWithoutError });


    const invalidItems = data.filter(item =>
        !item.imgValid ||
        !item.linkValid ||
        !item.titleValid ||
        !item.pageTitleValid ||
        !item.priceValid
    );
    let jsonErrorwebViewLink= '';
if (invalidItems.length > 0) {

    const jsonBuffer = Buffer.from(JSON.stringify(invalidItems, null, 2), 'utf-8');
    const result = await uploadJSONToGoogleDrive({
        buffer: jsonBuffer,
        fileName: `${site}-error.json`,
        mimeType: 'application/json',
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        serviceAccountCredentials: JSON.parse(
            Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
        ),
    });
   jsonErrorwebViewLink = result.webViewLink;
    console.log(`Uploaded invalid items to Google Drive: ${result.webViewLink}`);
     debugger;

}
debugger
console.log('dataWithoutError.length',dataWithoutError.filter((f,i)=>i<5).length, dataWithoutError.filter((f,i)=>i<5));
console.log('site', site);
const jsonBuffer = Buffer.from(JSON.stringify(dataWithoutError.filter((f,i)=>i<5), null, 2), 'utf-8');

    const resultData = await uploadJSONToGoogleDrive({
    buffer: jsonBuffer,
    fileName: `${site}.json`,
    mimeType: 'application/json',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    serviceAccountCredentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
    ),
});
console.log('✅ JSON file uploaded to Google Drive:', resultData.webViewLink);



const baseRowData = {
    Site: site,
    'Total Objects': dataWithoutError.length,
    'Invalid Titles': validTitle,
    'Invalid Page Titles': validPageTitle,
    'Invalid Links': validLinks,
    'Invalid Images': validimgs,
    'Invalid Prices': validPrice,
    'Unset Prices': unsetPrice,
    'Price Scrape Errors': priceScrapeError,
    'Product Not Available': totalNotAvailable,
    'Total Unique Objects (by link)': totalUniqueObjects.count,
    'Error Objects': dataWithError.length,
    "JSONERRORURL": jsonErrorwebViewLink ? jsonErrorwebViewLink : 'N/A',
    "JSONData":resultData ? resultData.webViewLink : 'N/A',
        'Start Time': oldestTimestamp,
    'End Time': newestTimestamp,
    'Span (min)': minutesSpan,
    'Total Pages': totalPages.count,
    'Unique Page URLs': uniquePageURLs.length,
    'AutoScroll': siteUrls.isAutoScroll ? 'true' : 'false',
    'productItemSelector': dataWithoutError.length > 0 ? dataWithoutError[0].matchedInfo?.matchedProductItemSelectorManual : 'N/A',  
};


if (!siteUrls.paused && dataWithoutError.length > 0) {
    debugger
    console.log('✅ Collected data length:', dataWithoutError.length);
    const dataToUpload = dataWithoutError.filter(f => f.linkValid && f.imgValid && f.titleValid && f.priceValid && !f.productNotInStock)
    console.log('✅ Data to upload length:', dataToUpload.length);
    await uploadCollection({
        fileName: site || URL_CATEGORIES,
        data: dataToUpload,
        gitFolder: site,
    });
    await emitAsync('log-to-sheet', {
        sheetTitle: 'Crawl Logs(success)',
        message: console.log(`Site ${site} is logging data to Google Sheet.`),
        rowData: baseRowData
    });


} else if (!siteUrls.paused) {
    debugger
    console.warn('⚠️ No valid data collected.');

    await emitAsync('log-to-sheet', {
        sheetTitle: 'Crawl Logs(failed)',
        message: console.log(`Site ${site} is logging data to Google Sheet.`),
        rowData: baseRowData
    });

    if (dataWithError.length > 0) {
        console.warn('First error sample:', dataWithError[0]);
    }

    process.exit(0);
}
