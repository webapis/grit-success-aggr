import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { emitAsync } from '../src/shared/events.js';
import '../src/shared/listeners.js'; // This registers the event handlers
import { pipe } from './pipe.js';

dotenv.config({ silent: true });

// --- Pipeline Stages ---

const initialize = (context) => {
    const summaryPath = process.argv[2] || './artifacts/final-summary.json';
    console.log(`Initializing summary upload from: ${summaryPath}`);
    return {
        ...context,
        summaryFilePath: path.resolve(summaryPath),
    };
};

const loadSummaryData = async (context) => {
    const { summaryFilePath } = context;
    console.log(`Reading final summary from: ${summaryFilePath}`);
    try {
        const content = await fs.readFile(summaryFilePath, 'utf-8');
        const summaryData = JSON.parse(content);
        return { ...context, summaryData };
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Summary file not found at ${summaryFilePath}. Please run the summarize script first.`);
        }
        throw error;
    }
};

const prepareSheetData = (context) => {
    const { summaryData } = context;
    if (!summaryData.aggregatedMetrics) {
        throw new Error('`aggregatedMetrics` not found in summary file.');
    }

    const metrics = summaryData.aggregatedMetrics;
    const rowData = { ...metrics };

    // Convert array fields to comma-separated strings for better sheet readability
    for (const key in rowData) {
        if (Array.isArray(rowData[key])) {
            rowData[key] = rowData[key].join(', ');
        }
    }

    console.log('Data prepared for Google Sheet upload.');
    return { ...context, sheetData: rowData };
};

const uploadToSheet = async (context) => {
    const { sheetData } = context;
    await emitAsync('log-to-sheet', {
        sheetTitle: 'Total Run Logs', // Specify a dedicated sheet for run summaries
        message: 'Aggregated run summary',
        rowData: sheetData,
    });
    console.log('✅ Successfully uploaded aggregated metrics to Google Sheet.');
    return context;
};

// --- Pipeline Definition ---

const uploadSummaryPipeline = pipe(
    initialize,
    loadSummaryData,
    prepareSheetData,
    uploadToSheet
);

// --- Main Execution ---

(async () => {
    try {
        await uploadSummaryPipeline({});
        console.log('\n✅ Summary upload pipeline completed successfully.');
    } catch (error) {
        console.error('❌ Error in the summary upload pipeline:', error.message);
        process.exit(1);
    }
})();