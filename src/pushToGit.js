import { Readable } from 'stream';
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import { Dataset } from 'crawlee';
import getAggrTimeSpan from "./sheet/getAggrTimeSpan.js";
import countUnique from "./sheet/countUnique.js";
import countByField from "./scrape-helpers/countByField.js";
import getUniquePageURLs from "./sheet/getUniquePageURLs.js";
import { emitAsync } from "./events.js";
import './listeners.js'; // ← This registers event handlers
import uploadJSONToGoogleDrive from "./drive/uploadJSONToGoogleDrive.js";
import { getCachedSiteConfigFromFile } from './helper/siteConfig.js';
import findDuplicatesByLink from './helper/findDuplicatesByLink.js';
dotenv.config({ silent: true });

const URL_CATEGORIES = process.env.URL_CATEGORIES;
const site = process.env.site;
const siteUrls = await getCachedSiteConfigFromFile()//urls.find(f => getMainDomainPart(f.urls[0]) === site)
debugger;
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
const dublicateURLs = findDuplicatesByLink(data)
debugger
debugger


const uniquePageURLs = getUniquePageURLs({ data: dataWithoutError });


const invalidItems = data.filter(item =>
    !item.imgValid ||
    !item.linkValid ||
    !item.titleValid ||
    !item.pageTitleValid ||
    !item.priceValid
);
let JSONErrorDrive = null;
let JSONErrorGit = null;
if (invalidItems.length > 0) {
    debugger;

    const jsonBuffer = Buffer.from(JSON.stringify(invalidItems.filter((f, i) => i < 5), null, 2), 'utf-8');

    JSONErrorDrive = await uploadJSONToGoogleDrive({
        buffer: jsonBuffer,
        fileName: `${site}-error.json`,
        mimeType: 'application/json',
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        serviceAccountCredentials: JSON.parse(
            Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
        ),
    });

    console.log(`Uploaded invalid items to Google Drive: ${JSONErrorDrive.webViewLink}`);
    debugger;

    JSONErrorGit = await uploadCollection({
        fileName: site,
        data: invalidItems.filter((f, i) => i < 5),
        gitFolder: "ErrorSample",
        compress: false
    });

}
debugger
console.log('dataWithoutError.length', dataWithoutError.filter((f, i) => i < 5).length, dataWithoutError.filter((f, i) => i < 5));
console.log('site', site);
const jsonBuffer = Buffer.from(JSON.stringify(dataWithoutError.filter((f, i) => i < 5), null, 2), 'utf-8');

const JSONDataDrive = await uploadJSONToGoogleDrive({
    buffer: jsonBuffer,
    fileName: `${site}.json`,
    mimeType: 'application/json',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    serviceAccountCredentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
    ),
});
console.log('✅ JSON file uploaded to Google Drive:', JSONDataDrive.webViewLink);

const JSONDataGit = await uploadCollection({
    fileName: site,
    data: dataWithoutError.filter((f, i) => i < 5),
    gitFolder: "validSample",
    compress: false
});
debugger
if (dublicateURLs.length > 1) {
    const JSONDublicateUrlDataGit = await uploadCollection({
        fileName: site,
        data: dataWithoutError.filter((f, i) => i < 5),
        gitFolder: "dublicateUrl",
        compress: false
    });
}
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
    "JSONErrorGit": JSONErrorGit ? JSONErrorGit.url : 'N/A',
    "JSONErrorDrive": JSONErrorDrive ? JSONErrorDrive.webViewLink : 'N/A',
    "JSONDataGit": JSONDataGit ? JSONDataGit.url : 'N/A',
    "JSONDataDrive": JSONDataDrive ? JSONDataDrive.webViewLink : 'N/A',
    'Start Time': oldestTimestamp,
    'End Time': newestTimestamp,
    'Span (min)': minutesSpan,
    'Total Pages': totalPages.count,
    'Unique Page URLs': uniquePageURLs.length,
    'AutoScroll': siteUrls.isAutoScroll ? 'true' : 'false',
    'productItemSelector': dataWithoutError.length > 0 ? dataWithoutError[0].matchedInfo?.matchedProductItemSelectorManual : 'N/A',
    'JSONDublicateUrlDataGit': JSONDublicateUrlDataGit ? JSONDublicateUrlDataGit.url : 'N/A'

};


if (!siteUrls.paused && dataWithoutError.length > 0) {
    debugger
    console.log('✅ Collected data length:', dataWithoutError.length);
    const dataToUpload = dataWithoutError.filter(f => f.linkValid && f.imgValid && f.titleValid && f.priceValid && !f.productNotInStock)
    console.log('✅ Data to upload length:', dataToUpload.length);
    const response = await uploadCollection({
        fileName: site || URL_CATEGORIES,
        data: dataToUpload,
        gitFolder: site,
    });
    debugger;
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
