import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { emitAsync } from '../src/shared/events.js';
import '../src/shared/listeners.js'; // This registers the event handlers
import { pipe } from './pipe.js';

dotenv.config({ silent: true });

// --- Pipeline Stages ---

const initialize = (context) => {
    const site = process.env.site;
    if (!site) {
        throw new Error('The "site" environment variable is not set.');
    }
    console.log(`Starting upload process for site: ${site}`);
    return {
        ...context,
        site,
        summaryPath: path.resolve(`./categorization_results/categorization-summary-${site}.json`),
        newWordsPath: path.resolve(`./categorization_results/new-words-${site}.json`),
    };
};

const loadAndProcessSummary = async (context) => {
    try {
        const summaryContent = await fs.readFile(context.summaryPath, 'utf-8');
        const { categoryCounts } = JSON.parse(summaryContent);
        const categoryRows = [];
        for (const categoryType in categoryCounts) {
            for (const categoryValue in categoryCounts[categoryType]) {
                categoryRows.push({
                    site: context.site,
                    category_type: categoryType,
                    category_value: categoryValue,
                    count: categoryCounts[categoryType][categoryValue],
                });
            }
        }
        return { ...context, categoryRows };
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('ℹ️ No categorization summary file found. Skipping upload.');
            return { ...context, categoryRows: [] };
        }
        throw error;
    }
};

const uploadSummary = async (context) => {
    if (context.categoryRows.length > 0) {
        await emitAsync('bulk-log-to-sheet', {
            sheetTitle: 'Categorization Summary',
            rowsData: context.categoryRows,
        });
        console.log('✅ Successfully uploaded categorization summary to Google Sheet.');
    } else {
        console.log('ℹ️ No categorization summary data to upload.');
    }
    return context;
};

const loadAndProcessNewWords = async (context) => {
    try {
        const newWordsContent = await fs.readFile(context.newWordsPath, 'utf-8');
        const newWordsData = JSON.parse(newWordsContent);
        const newWordsRows = newWordsData.map(row => ({ site: context.site, ...row }));
        return { ...context, newWordsRows };
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('ℹ️ No new words file found. Skipping upload.');
            return { ...context, newWordsRows: [] };
        }
        throw error;
    }
};

const uploadNewWords = async (context) => {
    if (context.newWordsRows.length > 0) {
        await emitAsync('bulk-log-to-sheet', {
            sheetTitle: 'New Words',
            rowsData: context.newWordsRows,
        });
        console.log('✅ Successfully uploaded new words to Google Sheet.');
    } else {
        console.log('ℹ️ No new words to upload.');
    }
    return context;
};

// --- Pipeline Definition ---

const uploadPipeline = pipe(
    initialize,
    loadAndProcessSummary,
    uploadSummary,
    loadAndProcessNewWords,
    uploadNewWords
);

// --- Main Execution ---

(async () => {
    try {
        await uploadPipeline({});
        console.log('\n✅ Upload pipeline completed successfully.');
    } catch (error) {
        console.error('❌ Error in the upload pipeline:', error);
        process.exit(1);
    }
})();