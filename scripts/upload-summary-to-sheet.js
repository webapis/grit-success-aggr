import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { emitAsync } from '../src/shared/events.js';
import '../src/shared/listeners.js'; // This registers the event handlers

dotenv.config({ silent: true });

/**
 * Reads the final summary JSON and uploads the aggregated metrics to Google Sheets.
 * @param {string} summaryFilePath - The path to the final-summary.json file.
 */
async function uploadSummaryToSheet(summaryFilePath) {
    try {
        console.log(`Reading final summary from: ${summaryFilePath}`);
        const content = await fs.readFile(summaryFilePath, 'utf-8');
        const summaryData = JSON.parse(content);

        if (!summaryData.aggregatedMetrics) {
            throw new Error('`aggregatedMetrics` not found in summary file.');
        }

        const metrics = summaryData.aggregatedMetrics;

        // Convert array fields to comma-separated strings for better sheet readability
        const rowData = { ...metrics };
        for (const key in rowData) {
            if (Array.isArray(rowData[key])) {
                rowData[key] = rowData[key].join(', ');
            }
        }

        await emitAsync('log-to-sheet', {
            sheetTitle: 'Total Run Logs', // Specify a dedicated sheet for run summaries
            message: `Aggregated run summary`,
            rowData: rowData,
        });

        console.log('✅ Successfully uploaded aggregated metrics to Google Sheet.');
    } catch (error) {
        console.error('❌ Error uploading summary to Google Sheet:', error);
        process.exit(1);
    }
}

const summaryPath = process.argv[2] || './artifacts/final-summary.json';
uploadSummaryToSheet(path.resolve(summaryPath));
