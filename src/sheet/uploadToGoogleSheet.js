import dotenv from "dotenv";
import analyzeData from "../route/scrape/analize-data/analizeData.js";
import logToLocalSheet from "./logToLocalSheet.js";
import { getDatasetItems } from "../crawlee/datasetOperations.js";
import { emitAsync } from '../events.js';
import '../listeners.js'; // ← This registers event handlers
dotenv.config({ silent: true });

const site = process.env.site;
export default async function uploadToGoogleSheet() {
    debugger
    const data = await getDatasetItems(site);
    debugger
    const analyzedData = await analyzeData(data);
    debugger
    const logResult = await logToLocalSheet(analyzedData);
    debugger
    return { analyzedData, logResult };
}


const { logResult } = await uploadToGoogleSheet();
await emitAsync('log-to-sheet', {
    sheetTitle: 'Crawl Logs(success)',
    message: `Site ${site} crawler result`,
    rowData: logResult
});
debugger;

