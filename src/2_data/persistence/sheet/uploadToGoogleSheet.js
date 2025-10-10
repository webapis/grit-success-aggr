import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { emitAsync } from '../../../shared/events.js';
import '../../../shared/listeners.js'; // ← This registers event handlers

dotenv.config({ silent: true });

const site = process.env.site;
const ANALYSIS_SUMMARY_FILE = path.join(process.cwd(), 'artifacts', 'analysis-summary.json');

async function uploadToGoogleSheet() {
    if (!fs.existsSync(ANALYSIS_SUMMARY_FILE)) {
        console.error(`Error: Analysis summary file not found at ${ANALYSIS_SUMMARY_FILE}`);
        console.error('Please run the analysis script first.');
        process.exit(1);
    }

    const analysisSummary = JSON.parse(fs.readFileSync(ANALYSIS_SUMMARY_FILE, 'utf-8'));

    // If running in GitHub Actions, save the summary to a file for artifact upload
    if (process.env.GITHUB_ACTIONS === 'true') {
        console.log('Running in GitHub Actions. Saving analysis summary to artifact file.');
        fs.writeFileSync('upload-summary.json', JSON.stringify(analysisSummary, null, 2));
    }

    if (process.env.UPLOAD_TO_SHEET === 'true') {
        await emitAsync('log-to-sheet', {
            sheetTitle: 'Crawl Logs(success)',
            message: `Site ${site} analysis summary`,
            rowData: analysisSummary
        });
    }
}

uploadToGoogleSheet().catch(error => {
    console.error('An error occurred during the sheet upload process:', error);
    process.exit(1);
});
