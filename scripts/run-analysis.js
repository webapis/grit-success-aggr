import dotenv from 'dotenv';
import analyzeData from '../src/2_data/processing/analize-data/analizeData.js';
import { getDatasetItems } from '../src/1_scraping/crawlee/datasetOperations.js';
import logToLocalSheet from '../src/2_data/persistence/sheet/logToLocalSheet.js';

dotenv.config({ silent: true });

const site = process.env.site;

if (!site) {
    console.error('Error: "site" environment variable is not set.');
    console.log('Please set it, e.g., "export site=example.com" or add it to your .env file');
    process.exit(1);
}

(async () => {
    try {
        console.log(`Fetching categorized data for site: ${site}`);
        const data = await getDatasetItems(`${site}-categorized`);

        if (!data || data.length === 0) {
            console.log('No data found to analyze.');
            return;
        }

        console.log(`Found ${data.length} items. Starting analysis...`);
        const analysisResult = await analyzeData(data);

        console.log('\n--- Analysis Complete ---');
        logToLocalSheet(analysisResult);
        console.log('Analysis results saved to logToLocalSheet.json');
        console.log('-----------------------\n');
        console.log(JSON.stringify(analysisResult, null, 2));

    } catch (error) {
        console.error('An error occurred during analysis:', error);
        process.exit(1);
    }
})();
