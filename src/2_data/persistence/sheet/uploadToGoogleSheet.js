import dotenv from "dotenv";
import analyzeData from "../../processing/analize-data/analizeData.js";
import fs from 'fs';
import logToLocalSheet from "./logToLocalSheet.js";
import { getDatasetItems } from "../../../1_scraping/crawlee/datasetOperations.js";
import sortPageData from "../../../1_scraping/navigation/helper/sortPageData.js";
import { flattenObjectForSheets } from "./flattenObjectForSheets.js";

import { findDuplicateObjects } from "./findDuplicateObjects.js";
import { emitAsync } from '../../../shared/events.js';
import '../../../shared/listeners.js'; // ← This registers event handlers
dotenv.config({ silent: true });

const site = process.env.site;
export default async function uploadToGoogleSheet() {
    debugger
    const data = await getDatasetItems(`${site}-categorized`);
    debugger
    const analyzedData = await analyzeData(data);
    debugger
    const { pageItems = [], pageNumbers = [] } = logToLocalSheet(analyzedData);
    debugger
    console.log('pageItems--, pageNumbers--', pageItems, pageNumbers);
    const result = sortPageData(pageItems, pageNumbers);
    const logResult = logToLocalSheet({ pageItems: result.pageItems.join(','), pageNumbers: result.pageNumbers.join(',') });
    debugger

    // If running in GitHub Actions, save the logResult to a file for artifact upload
    if (process.env.GITHUB_ACTIONS === 'true') {
        console.log('Running in GitHub Actions. Saving logResult to artifact file.');
        fs.writeFileSync('upload-summary.json', JSON.stringify(logResult, null, 2));
    } else {
        console.log('Not in GitHub Actions. Skipping artifact file creation.');
    }

    return { analyzedData, logResult };
}

debugger
const { logResult } = await uploadToGoogleSheet();
const { debug } = logToLocalSheet()
const data = await getDatasetItems(site);
const dataWithoutError = [...data.filter(f => !f.error)];
const flattenedData = dataWithoutError.map(flattenObjectForSheets);
const duplicateURLs = findDuplicateObjects(flattenedData);
debugger
if (process.env.UPLOAD_TO_SHEET === 'true') {
    debugger
    await emitAsync('log-to-sheet', {
        sheetTitle: 'Crawl Logs(success)',
        message: `Site ${site} crawler result`,
        rowData: logResult
    });

    debugger
    if (debug && duplicateURLs.length > 0) {
        debugger
        const limited = duplicateURLs.sort((a, b) => a.link - b.link).filter((f, i) => i < 30);
        debugger
        console.log('Duplicate URLs found:', duplicateURLs.length);
        await emitAsync('bulk-log-to-sheet', {

            message: `Site ${site} crawler result`,
            rowsData: limited
        });
    }
}

debugger;
