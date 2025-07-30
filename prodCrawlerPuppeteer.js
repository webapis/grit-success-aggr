//https://gemini.google.com/app/22f6ffd689b5a270
import { emitAsync } from './src/events.js';
import './src/listeners.js'; // ← This registers event handlers

import { PuppeteerCrawler } from "crawlee";
import { router } from "./prodRoutesPuppeteer.js";
import preNavigationHooks from "./crawler-helper/preNavigationHooksProd2.js";
import puppeteer from './crawler-helper/puppeteer-stealth.js';
import getMainDomainPart from './src/scrape-helpers/getMainDomainPart.js';

// Import googleapis for interacting with Google Sheets
import { google } from 'googleapis';

const site = process.env.site;
const local = process.env.local;
const HEADLESS = process.env.HEADLESS;

// Environment variables for Google Sheets access
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

/**
 * Fetches site URLs and pause status from a Google Sheet.
 * @param {string} targetSite - The site name to look for in the sheet.
 * @returns {Promise<Object|null>} An object containing site URLs, paused status, and reason, or null if not found.
 */
async function fetchSiteUrlsFromGoogleSheet(targetSite) {
  debugger
    if (!GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        console.error('Error: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set.');
        return null;
    }
    if (!GOOGLE_SHEET_ID) {
        console.error('Error: GOOGLE_SHEET_ID environment variable is not set.');
        return null;
    }

    let credentials;
    try {
        // Decode base64 credentials
        const decodedCredentials = Buffer.from(GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf8');
        credentials = JSON.parse(decodedCredentials);
    } catch (error) {
        console.error('Error decoding or parsing Google Service Account Credentials:', error.message);
        return null;
    }

    try {
        // Authenticate with Google Sheets API
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Fetch data from the 'wbags' sheet, columns A to F (brands, funcPageSelector, isAutoScroll, urls, paused, pausedReason)
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'wbags!A:F', // Adjust range if your columns for paused/pausedReason are different
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            console.log('No data found in the Google Sheet.');
            return null;
        }

        // Assuming the first row is a header, skip it.
        // And assuming:
        // Column A (index 0) is 'brands'
        // Column D (index 3) is 'urls'
        // Column E (index 4) is 'paused'
        // Column F (index 5) is 'pausedReason'
        const headerRow = rows[0]; // You might want to validate headers here
        const dataRows = rows.slice(1); // Skip header

        for (const row of dataRows) {
            const brand = row[0] ? row[0].trim() : '';
            if (brand.toLowerCase() === targetSite.toLowerCase()) {
                const urlsString = row[3] || ''; // URLs are in column D (index 3)
                const urls = urlsString.split(',').map(url => url.trim()).filter(url => url !== '');
                const paused = (row[4] || '').toLowerCase() === 'true'; // Paused status in column E (index 4)
                const pausedReason = row[5] || ''; // Paused reason in column F (index 5)

                return {
                    urls: urls,
                    // paused: paused,
                    // pausedReason: pausedReason,
                };
            }
        }

        console.log(`Site "${targetSite}" not found in the Google Sheet.`);
        return null;

    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error.message);
        return null;
    }
}

// Main execution block
(async () => {
    const siteUrls = await fetchSiteUrlsFromGoogleSheet(site);
debugger
    if (!siteUrls) {
        console.error(`Could not retrieve configuration for site: ${site}. Exiting.`);
        process.exit(1);
    }

    if (siteUrls.paused) {
        await emitAsync('log-to-sheet', {
            sheetTitle: 'paused-sites',
            message: `Site ${site} is paused from aggregating. Exiting...`,
            rowData: {
                site,
                status: 'Paused',
                pausedReason: siteUrls.pausedReason || 'No reason provided',
                timestamp: new Date().toISOString(),
            }
        });
        console.log(`Site ${site} is paused from aggregating. Exiting...`); // Ensure it's logged to console
        process.exit(0);
    } else {
        const crawler = new PuppeteerCrawler({
            launchContext: {
                useChrome: local === 'true' ? true : false,
                launcher: puppeteer,
                launchOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--window-size=1920,1080'
                    ]
                }
            },
            requestHandler: router,
            maxConcurrency: 1,
            preNavigationHooks,
            navigationTimeoutSecs: 120,
            headless: HEADLESS === "false" ? false : true,
            requestHandlerTimeoutSecs: 600000,
            // maxRequestsPerCrawl: 50
        });

        crawler.run(siteUrls.urls);
    }
})();
