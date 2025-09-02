import dotenv from "dotenv";
import analyzeData from "../route/scrape/analize-data/analizeData.js";
import logToLocalSheet from "./logToLocalSheet.js";
import { getDatasetItems } from "../crawlee/datasetOperations.js";
import sortPageData from "../route/helper/sortPageData.js";
import { flattenObjectForSheets } from "./flattenObjectForSheets.js";
import findDuplicatesByLink from "../route/scrape/analize-data/findDuplicatesByLink.js";
import { findDuplicateObjects } from "./findDuplicateObjects.js";
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
    const { pageItems = [], pageNumbers = [] } = logToLocalSheet(analyzedData);
    console.log('pageItems--, pageNumbers--', pageItems, pageNumbers);
    const result = sortPageData(pageItems, pageNumbers);
    const logResult = logToLocalSheet({ pageItems: result.pageItems.join(','), pageNumbers: result.pageNumbers.join(',') });
    debugger

    return { analyzedData, logResult };
}

debugger
const { logResult } = await uploadToGoogleSheet();
const { debug } = logToLocalSheet()
const data = await getDatasetItems(site);
const dataWithoutError = data.filter(f => !f.error);
const flattenedData = dataWithoutError.map(flattenObjectForSheets);
const duplicateURLs = findDuplicateObjects(flattenedData);
debugger
await emitAsync('log-to-sheet', {
    sheetTitle: 'Crawl Logs(success)',
    message: `Site ${site} crawler result`,
    rowData: logResult
});

debugger
if (debug && duplicateURLs.length > 0) {
    console.log('Duplicate URLs found:', duplicateURLs.length);
    await emitAsync('bulk-log-to-sheet', {

        message: `Site ${site} crawler result`,
        rowData: duplicateURLs.filter((f,i)=>i<30)
    });
}

debugger;

