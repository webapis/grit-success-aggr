// src/listeners.js
import { emitter } from './events.js';
import { logToGoogleSheet } from './sheet/logToGoogleSheet.js';
import { uploadCollection } from './uploadCollection.js';
import dotenv from 'dotenv';

dotenv.config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CREDENTIALS = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8'))

emitter.on('upload-successful-data', async ({ site, data }) => {
  await uploadCollection({
    fileName: site,
    data,
    gitFolder: site
  });
});

emitter.on('log-to-sheet', async ({ sheetTitle = 'Crawl Logs', rowData, message }) => {
  console.log('Logging to Google Sheet:_____', sheetTitle, rowData,'SHEET_ID:'+SHEET_ID,'CREDENTIALS:'+ CREDENTIALS);
  await logToGoogleSheet({
    sheetId: SHEET_ID,
    sheetTitle,
    serviceAccountCredentials: CREDENTIALS,
    rowData
  });
    if (message) {
        console.log(message);
    }
});

emitter.on('no-valid-data', ({ site }) => {
  console.warn('⚠️ No valid data collected for site:', site);
});

emitter.on('error-sample', ({ error }) => {
  console.warn('Sample error object:', error);
});
