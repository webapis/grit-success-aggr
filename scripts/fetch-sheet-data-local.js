import { google } from 'googleapis';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { processCachedSheetData } from '../src/config/siteConfig.js';
import { pipe } from './pipe.js';

dotenv.config();

// --- Pipeline Stages ---

const initialize = (context) => {
    console.log('Initializing local sheet data fetch...');
    const targetSite = process.env.site;
    if (!targetSite) throw new Error('site environment variable is not set');

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set');
    if (!process.env.GOOGLE_SHEET_ID) throw new Error('GOOGLE_SHEET_ID environment variable is not set');

    return { ...context, targetSite };
};

const authenticate = (context) => {
    console.log('🔑 Decoding credentials and authenticating...');
    const decodedCredentials = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf8');
    const credentials = JSON.parse(decodedCredentials);

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log('🔐 Authenticated successfully.');
    return { ...context, auth };
};

const fetchSheetData = async (context) => {
    const { auth } = context;
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'wbags-scroll';

    console.log(`📊 Fetching data from sheet: ${sheetName}...`);
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${sheetName}!A:O`,
    });

    const rows = response.data.values;
    console.log(`📝 Retrieved ${rows ? rows.length : 0} rows from sheet`);

    if (!rows || rows.length === 0) {
        console.log('⚠️ No data found in sheet. Exiting.');
        return { ...context, rows: [], fetchSkipped: true };
    }

    return { ...context, rows };
};

const processSheetData = (context) => {
    if (context.fetchSkipped) return context;

    const { rows, targetSite } = context;
    console.log(`Processing sheet data for site: ${targetSite}`);
    const siteConfig = processCachedSheetData({ data: rows }, targetSite);

    if (!siteConfig) {
        throw new Error(`No configuration found for site: ${targetSite}`);
    }

    return { ...context, siteConfig };
};

const saveSiteConfig = async (context) => {
    if (context.fetchSkipped) return context;

    const { siteConfig } = context;
    await fs.writeFile('siteConfig.json', JSON.stringify(siteConfig, null, 2), 'utf8');
    console.log(`✅ Site configuration saved to siteConfig.json for site: ${siteConfig.targetSite}`);
    return context;
};

const logConfigSummary = (context) => {
    if (context.fetchSkipped) return context;
    
    const { siteConfig } = context;
    console.log(`📊 Configuration summary:`);
    console.log(`  Site: ${siteConfig.targetSite}`);
    console.log(`  URLs: ${siteConfig.totalUrls}`);
    console.log(`  Paused: ${siteConfig.paused}`);
    console.log(`  Scrollable: ${siteConfig.scrollable}`);
    console.log(`  Items per page: ${siteConfig.debug || 'Not set'}`);
    return context;
};

// --- Pipeline Definition ---

const fetchPipeline = pipe(
    initialize,
    authenticate,
    fetchSheetData,
    processSheetData,
    saveSiteConfig,
    logConfigSummary
);

// --- Main Execution ---

(async () => {
    try {
        await fetchPipeline({});
        console.log('\n✅ Local data fetch pipeline completed successfully.');
    } catch (error) {
        console.error('❌ Error in local data fetch pipeline:', error.message);
        process.exit(1);
    }
})();