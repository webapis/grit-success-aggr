import { logDataToGoogleSheet } from "./logDataToGoogleSheet.js";
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import { Dataset } from 'crawlee';
import getAggrTimeSpan from "./sheet/getAggrTimeSpan.js";
import countUniquePages from "./sheet/countUniquePages.js";
import getUniquePageURLs from "./sheet/getUniquePageURLs.js";
dotenv.config({ silent: true });

const URL_CATEGORIES = process.env.URL_CATEGORIES
const site = process.env.site
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS= JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8'))
const GOOGLE_SHEET_ID=process.env.GOOGLE_SHEET_ID
debugger
const dataset = await Dataset.open(site);
const { items: data } = await dataset.getData()

const dataWithoutError = data.filter(f => !f.error)
const dataWithError = data.filter(f => f.error)
const { oldestTimestamp, newestTimestamp, minutesSpan } = getAggrTimeSpan({data})
const totalPages =countUniquePages({data})
const uniquePageURLs = getUniquePageURLs({ data:dataWithoutError })
debugger

if (dataWithoutError.length > 0) {
    console.log('collected data length', dataWithoutError.length)
    await uploadCollection({ fileName: site || URL_CATEGORIES, data: dataWithoutError, gitFolder: site })
    await logDataToGoogleSheet({ dataWithoutErrorLength: dataWithoutError.length, dataWithErrorLength: dataWithError.length, site, serviceAccountCredentials:GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,GOOGLE_SHEET_ID,start:oldestTimestamp, end:newestTimestamp,span:minutesSpan,totalPages:totalPages.count,uniquePageURLs })
} else {
    await logDataToGoogleSheet({
        dataWithoutErrorLength: 0,
        dataWithErrorLength: dataWithError.length,
        site,
        serviceAccountCredentials: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
        GOOGLE_SHEET_ID,
        start: oldestTimestamp,
        end: newestTimestamp,
        span: minutesSpan,
        totalPages: totalPages.count,
        uniquePageURLs,
    });

    console.warn('⚠️ No valid data collected.');
    if (dataWithError.length > 0) {
        console.warn('ERROR details:', dataWithError[0]);
    }

    // Optionally exit without error
    process.exit(0);
}
