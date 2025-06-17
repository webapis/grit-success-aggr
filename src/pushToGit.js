import { logDataToGoogleSheet } from "./logDataToGoogleSheet.js";
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import { Dataset } from 'crawlee';

dotenv.config({ silent: true });

const URL_CATEGORIES = process.env.URL_CATEGORIES
const site = process.env.site
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS= JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8'))
const GOOGLE_SHEET_ID=process.env.GOOGLE_SHEET_ID
debugger
const dataset = await Dataset.open(site);
const { items: data } = await dataset.getData()
const sortedData =data.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateA.getTime() - dateB.getTime();
  });

// 2. Extract the oldest (first element after ascending sort)
const oldestEntry = data[0];
const oldestTimestamp = oldestEntry.timestamp;
// 3. Extract the newest (last element after ascending sort)
const newestEntry = data[data.length - 1];
const newestTimestamp = newestEntry.timestamp;
const dataWithoutError = data.filter(f => !f.error)
const dataWithError = data.filter(f => f.error)

//await uploadCollection({fileName, data,gitFolder})
if (dataWithoutError.length > 0) {
    console.log('collected data length', dataWithoutError.length)
    await uploadCollection({ fileName: site || URL_CATEGORIES, data: dataWithoutError, gitFolder: site })
    await logDataToGoogleSheet({ dataWithoutErrorLength: dataWithoutError.length, dataWithErrorLength: dataWithError.length, site, serviceAccountCredentials:GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,GOOGLE_SHEET_ID,start:oldestTimestamp, end:newestTimestamp })
}
else {
    await logDataToGoogleSheet({ dataWithoutErrorLength: dataWithoutError.length, dataWithErrorLength: dataWithError.length, site, serviceAccountCredentials:GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,GOOGLE_SHEET_ID,start:oldestTimestamp, end:newestTimestamp })

    console.log('ERROR length:', dataWithError.length)
    console.log('ERROR :', dataWithError[0])
    throw new Error(`data length:${dataWithoutError.length}`);


}
