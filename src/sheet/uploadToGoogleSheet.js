import dotenv from "dotenv";
import analyzeData from "../route/scrape/analize-data/analizeData.js";
import logToLocalSheet from "./logToLocalSheet.js";
import { getDatasetItems } from "../crawlee/datasetOperations.js";
import sortPageData from "../route/helper/sortPageData.js";
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
    await logToLocalSheet(analyzedData);
    const { pageItems, pageNumbers } = logToLocalSheet()
    const result = sortPageData(pageItems, pageNumbers);
   const logResult =  logToLocalSheet(result);
    debugger

    return { analyzedData, logResult:{...logResult,pageItems:result.pageItems.join(','), pageNumbers:result.pageNumbers.join(',')} };
}

debugger
const { logResult } = await uploadToGoogleSheet();
debugger
await emitAsync('log-to-sheet', {
    sheetTitle: 'Crawl Logs(success)',
    message: `Site ${site} crawler result`,
    rowData: logResult
});
debugger;

