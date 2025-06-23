import { logToGoogleSheet } from "./sheet/logToGoogleSheet.js";
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import { Dataset } from 'crawlee';
import getAggrTimeSpan from "./sheet/getAggrTimeSpan.js";
import countUniquePages from "./sheet/countUniquePages.js";
import getUniquePageURLs from "./sheet/getUniquePageURLs.js";

dotenv.config({ silent: true });

const URL_CATEGORIES = process.env.URL_CATEGORIES;
const site = process.env.site;
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8'));
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

const dataset = await Dataset.open(site);
const { items: data } = await dataset.getData();

const dataWithoutError = data.filter(f => !f.error);
const dataWithError = data.filter(f => f.error);
const { oldestTimestamp, newestTimestamp, minutesSpan } = getAggrTimeSpan({ data });
const totalPages = countUniquePages({ data });
const uniquePageURLs = getUniquePageURLs({ data: dataWithoutError });

const sheetTitle = 'Crawl Logs'; // 👈 You can change this per use case

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

if (dataWithoutError.length > 0) {
  console.log('✅ Collected data length:', dataWithoutError.length);

  await uploadCollection({
    fileName: site || URL_CATEGORIES,
    data: dataWithoutError,
    gitFolder: site,
  });

  await logToGoogleSheet({
    sheetId: GOOGLE_SHEET_ID,
    sheetTitle,
    serviceAccountCredentials: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
    rowData: baseRowData,
  });

} else {
  console.warn('⚠️ No valid data collected.');

  await logToGoogleSheet({
    sheetId: GOOGLE_SHEET_ID,
    sheetTitle,
    serviceAccountCredentials: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
    rowData: baseRowData, // still logs zeros
  });

  if (dataWithError.length > 0) {
    console.warn('First error sample:', dataWithError[0]);
  }

  process.exit(0);
}
