import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import analyzeData from '../src/2_data/processing/analize-data/analizeData.js';

dotenv.config({ silent: true });

const site = process.env.site;
const FINAL_OUTPUT_FILE = path.join(process.cwd(), 'artifacts', 'final-products.json');
const ANALYSIS_SUMMARY_FILE = path.join(process.cwd(), 'artifacts', 'analysis-summary.json');

if (!site) {
    console.error('Error: "site" environment variable is not set.');
    console.log('Please set it, e.g., "export site=example.com" or add it to your .env file');
    process.exit(1);
}

(async () => {
    try {
        console.log(`Reading final merged data for site: ${site}`);
        
        if (!fs.existsSync(FINAL_OUTPUT_FILE)) {
            console.error(`Error: Final data file not found at ${FINAL_OUTPUT_FILE}`);
            console.error('Please ensure the merge process has run successfully.');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(FINAL_OUTPUT_FILE, 'utf-8'));

        if (!data || data.length === 0) {
            console.log('No data found to analyze.');
            return;
        }

        console.log(`Found ${data.length} items. Starting analysis...`);
        const analysisResult = await analyzeData(data);

        console.log('\n--- Analysis Complete ---');
        if (!fs.existsSync(path.dirname(ANALYSIS_SUMMARY_FILE))) {
            fs.mkdirSync(path.dirname(ANALYSIS_SUMMARY_FILE), { recursive: true });
        }
        fs.writeFileSync(ANALYSIS_SUMMARY_FILE, JSON.stringify(analysisResult, null, 2));
        console.log(`Analysis results saved to ${ANALYSIS_SUMMARY_FILE}`);
        console.log('-----------------------\n');
        console.log(JSON.stringify(analysisResult, null, 2));

    } catch (error) {
        console.error('An error occurred during analysis:', error);
        process.exit(1);
    }
})();
