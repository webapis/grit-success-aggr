
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { emitAsync } from '../src/shared/events.js';
import '../src/shared/listeners.js'; // This registers the event handlers

dotenv.config({ silent: true });

async function uploadCategorizationResults() {
    try {
        const site = process.env.site;
        const summaryPath = path.resolve(`./categorization_results/categorization-summary-${site}.json`);
        const newWordsPath = path.resolve(`./categorization_results/new-words-${site}.json`);

        // Process and upload categorization summary
        const summaryContent = await fs.readFile(summaryPath, 'utf-8');
        const summaryData = JSON.parse(summaryContent);
        const { categoryCounts } = summaryData;

        const categoryRows = [];
        for (const categoryType in categoryCounts) {
            for (const categoryValue in categoryCounts[categoryType]) {
                categoryRows.push({
                    site: site,
                    category_type: categoryType,
                    category_value: categoryValue,
                    count: categoryCounts[categoryType][categoryValue]
                });
            }
        }

        await emitAsync('bulk-log-to-sheet', {
            sheetTitle: 'Categorization Summary',
            rowsData: categoryRows,
        });
        console.log('✅ Successfully uploaded categorization summary to Google Sheet.');

        // Process and upload new words
        const newWordsContent = await fs.readFile(newWordsPath, 'utf-8');
        const newWordsData = JSON.parse(newWordsContent);
        const newWordsRows = newWordsData.map(row => ({ site, ...row }));

        await emitAsync('bulk-log-to-sheet', {
            sheetTitle: 'New Words',
            rowsData: newWordsRows,
        });
        console.log('✅ Successfully uploaded new words to Google Sheet.');

    } catch (error) {
        console.error('❌ Error uploading categorization results to Google Sheet:', error);
        process.exit(1);
    }
}

uploadCategorizationResults();
