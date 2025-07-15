
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import { Dataset } from 'crawlee';
import getAggrTimeSpan from "./sheet/getAggrTimeSpan.js";
import countUnique from "./sheet/countUnique.js";
import countByField from "./scrap/countByField.js";
import getUniquePageURLs from "./sheet/getUniquePageURLs.js";
import getMainDomainPart from "./scrap/getMainDomainPart.js";
import { emitAsync } from "./events.js";
import './listeners.js'; // ← This registers event handlers
import urls from '../sites/products/urls.json' assert { type: 'json' };
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
const totalNotAvailable = countByField(data, 'productNotInStock',expectedValue = true);
debugger
const uniquePageURLs = getUniquePageURLs({ data: dataWithoutError });

const baseRowData = {
    Site: site,
    'Total Objects': dataWithoutError.length,
    'Invalid Titles': validTitle,
    'Invalid Page Titles': validPageTitle,
    'Invalid Links': validLinks,
    'Invalid Images': validimgs,
    'Invalid Prices': validPrice,
    'Product Not Available': totalNotAvailable,
    'Total Unique Objects (by link)': totalUniqueObjects.count,
    'Error Objects': dataWithError.length,
    'Start Time': oldestTimestamp,
    'End Time': newestTimestamp,
    'Span (min)': minutesSpan,
    'Total Pages': totalPages.count,
    'Unique Page URLs': uniquePageURLs.length,
    'AutoScroll': siteUrls.isAutoScroll ? 'true' : 'false'
};


if (!siteUrls.paused && dataWithoutError.length > 0) {
    debugger
    console.log('✅ Collected data length:', dataWithoutError.length);
const dataToUpload= dataWithoutError.filter(f=> f.linkValid && f.imgValid && f.titleValid  && f.priceValid && !f.productNotInStock)
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
