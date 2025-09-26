// fetch-sheet-data-local.js - Local development data fetching script
import { google } from 'googleapis';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { processCachedSheetData } from '../src/config/siteConfig.js';

// Load environment variables for local development
dotenv.config();

async function fetchSheetDataLocal() {
    try {
        const targetSite = process.env.site;
        if (!targetSite) {
            throw new Error('site environment variable is not set');
        }

        console.log(`🔍 Fetching Google Sheets data for site: ${targetSite}`);
        
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set');
        }
        
        if (!process.env.GOOGLE_SHEET_ID) {
            throw new Error('GOOGLE_SHEET_ID environment variable is not set');
        }
        
        console.log('🔑 Decoding credentials...');
        const decodedCredentials = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf8');
        const credentials = JSON.parse(decodedCredentials);
        
        console.log('🔐 Authenticating with Google Sheets API...');
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        
        const sheets = google.sheets({ version: 'v4', auth });
        const sheetName = process.env.GOOGLE_SHEET_NAME || 'wbags-scroll';
        
        console.log(`📊 Fetching data from sheet: ${sheetName}...`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `${sheetName}!A:N`,
        });
        
        const rows = response.data.values;
        console.log(`📝 Retrieved ${rows ? rows.length : 0} rows from sheet`);
        
        if (!rows || rows.length === 0) {
            console.log('⚠️  No data found in sheet');
            return;
        }
        
        // Process the raw sheet data for the specific site using the imported function
        const siteConfig = processCachedSheetData({ data: rows }, targetSite);
        
        if (!siteConfig) {
            throw new Error(`No configuration found for site: ${targetSite}`);
        }
        
        // Save the processed site configuration
        await fs.writeFile('siteConfig.json', JSON.stringify(siteConfig, null, 2), 'utf8');
        console.log(`✅ Site configuration saved to siteConfig.json for site: ${targetSite}`);
        
        // Show configuration summary
        console.log(`📊 Configuration summary:`);
        console.log(`  Site: ${siteConfig.targetSite}`);
        console.log(`  URLs: ${siteConfig.totalUrls}`);
        console.log(`  Paused: ${siteConfig.paused}`);
        console.log(`  Scrollable: ${siteConfig.scrollable}`);
        console.log(`  Items per page: ${siteConfig.debug || 'Not set'}`);
        
    } catch (error) {
        console.error('❌ Error fetching data from Google Sheets:', error.message);
        process.exit(1);
    }
}

fetchSheetDataLocal();


