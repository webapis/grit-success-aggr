
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import { Dataset } from 'crawlee';
import getAggrTimeSpan from "./sheet/getAggrTimeSpan.js";
import countUniquePages from "./sheet/countUniquePages.js";
import getUniquePageURLs from "./sheet/getUniquePageURLs.js";
import { emitAsync } from "./events.js";
import './listeners.js'; // ← This registers event handlers
dotenv.config({ silent: true });

const URL_CATEGORIES = process.env.URL_CATEGORIES;
const site = process.env.site;
const siteUrls = urls.find(f => f.site === site)
const dataset = await Dataset.open(site);
const { items: data } = await dataset.getData();

const dataWithoutError = data.filter(f => !f.error);
const dataWithError = data.filter(f => f.error);
const { oldestTimestamp, newestTimestamp, minutesSpan } = getAggrTimeSpan({ data });
const totalPages = countUniquePages({ data });
const uniquePageURLs = getUniquePageURLs({ data: dataWithoutError });



const baseRowData = {
    Site: site,
    'Successful Entries': dataWithoutError.length,
    'Error Entries': dataWithError.length,
    'Start Time': oldestTimestamp,
    'End Time': newestTimestamp,
    'Span (min)': minutesSpan,
    'Total Pages': totalPages.count,
    'Unique Page URLs': uniquePageURLs.length,
};

if (!siteUrls.paused) {
    process.exit(0);
} else
    if (dataWithoutError.length > 0) {
        debugger
        console.log('✅ Collected data length:', dataWithoutError.length);

        await uploadCollection({
            fileName: site || URL_CATEGORIES,
            data: dataWithoutError,
            gitFolder: site,
        });
        await emitAsync('log-to-sheet', {
            sheetTitle: 'Crawl Logs(success)',
            message: console.log(`Site ${site} is logging data to Google Sheet.`),
            rowData: baseRowData
        });


    } else {
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
