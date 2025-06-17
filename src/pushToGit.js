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

const dataWithoutError = data.filter(f => !f.error)
const dataWithError = data.filter(f => f.error)

//await uploadCollection({fileName, data,gitFolder})
if (dataWithoutError.length > 0) {
    console.log('collected data length', dataWithoutError.length)
    await uploadCollection({ fileName: site || URL_CATEGORIES, data: dataWithoutError, gitFolder: site })
    await logDataToGoogleSheet({ dataWithoutErrorLength: dataWithoutError.length, dataWithErrorLength: dataWithError.length, site, serviceAccountCredentials:GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,GOOGLE_SHEET_ID })
}
else {
    await logDataToGoogleSheet({ dataWithoutErrorLength: dataWithoutError.length, dataWithErrorLength: dataWithError.length, site, serviceAccountCredentials:GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,GOOGLE_SHEET_ID })

    console.log('ERROR length:', dataWithError.length)
    console.log('ERROR :', dataWithError[0])
    throw new Error(`data length:${dataWithoutError.length}`);


}
