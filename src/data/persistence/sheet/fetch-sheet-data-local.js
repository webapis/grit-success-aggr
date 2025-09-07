// fetch-sheet-data-local.js - Local development data fetching script
import { google } from 'googleapis';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import getMainDomainPart from '../helper/getMainDomainPart.js';


// Load environment variables for local development
dotenv.config();

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Parses scrollable(boolean) from the sheet value
 */
function parseScrollable(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    return value.trim().toLowerCase() === 'true';
}
function parseDebug(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    return value.trim().toLowerCase() === 'true';
}
/**
 * Parses items per page from the sheet value
 */
function parseItemsPerPage(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }
    const parsed = parseInt(value.trim(), 10);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Parses filtering needed boolean from the sheet value
 */
function parseFilteringNeeded(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    return value.trim().toLowerCase() === 'true';
}

/**
 * Processes raw sheet data to extract site configuration for a specific site
 */
function processSiteConfig(rows, targetSite) {
    if (!rows || rows.length === 0) {
        console.log('No data found in sheet.');
        return null;
    }

    if (rows.length < 2) {
        console.log('No data rows found (only header present).');
        return null;
    }

    const dataRows = rows.slice(1); // Skip header row
    let allUrls = [];
    let siteConfigurations = [];
    let foundBrand = false;

    console.log(`Processing data for site: "${targetSite}"`);

    for (const [index, row] of dataRows.entries()) {
        const urlsString = row[7] || ''; // URLs are in column H (index 7)
        
        if (urlsString.trim()) {
            const rowUrls = urlsString
                .split(',')
                .map(url => url.trim())
                .filter(url => url !== '')
                .filter(url => isValidUrl(url));

            const matchingUrls = rowUrls.filter(url => {
                try {
                    const mainDomain = getMainDomainPart(url);
                    return mainDomain.toLowerCase() === targetSite.toLowerCase();
                } catch (error) {
                    console.warn(`Error extracting domain from ${url}:`, error.message);
                    return false;
                }
            });

            if (matchingUrls.length > 0) {
                foundBrand = true;

                const rowConfig = {
                    brand: row[0] ? row[0].trim() : '',
                    paginationSelector: row[1] ? row[1].trim() : '',
                    paginationParameterName: row[2] ? row[2].trim() : '',
                    scrollable: parseScrollable(row[3]),
                    showMoreButtonSelector: row[4] ? row[4].trim() : '',
                    totalProductCounterSelector: row[5] ? row[5].trim() : '',
                    debug: parseDebug(row[6]),
                    urls: matchingUrls,
                    paused: row[8] ? row[8].trim().toLowerCase() === 'true' : false,
                    pausedReason: row[9] ? row[9].trim() : '',
                    inflexible_notes: row[10] ? row[10].trim() : '',
                    rowIndex: index + 2
                };

                siteConfigurations.push(rowConfig);
                allUrls.push(...matchingUrls);
            }
        }
    }

    if (!foundBrand || allUrls.length === 0) {
        console.log(`No URLs found for site "${targetSite}".`);
        return null;
    }

    // Build final configuration for the specific site
    const isPaused = siteConfigurations.some(config => config.paused);
    const pausedReason = siteConfigurations.find(config => config.paused)?.pausedReason || '';

    return {
        targetSite: targetSite,
        urls: allUrls,
        totalUrls: allUrls.length,
        paused: isPaused,
        pausedReason: pausedReason,
        inflexible_notes: siteConfigurations[0]?.inflexible_notes || '',
        configurations: siteConfigurations,
        paginationSelector: siteConfigurations[0]?.paginationSelector || '',
        paginationParameterName: siteConfigurations[0]?.paginationParameterName || '',
        scrollable: siteConfigurations[0]?.scrollable || false,
        showMoreButtonSelector: siteConfigurations[0]?.showMoreButtonSelector || '',
        totalProductCounterSelector: siteConfigurations[0]?.totalProductCounterSelector || '',
        debug: siteConfigurations[0]?.debug || false,
        cachedAt: new Date().toISOString()
    };
}

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
            range: `${sheetName}!A:K`,
        });
        
        const rows = response.data.values;
        console.log(`📝 Retrieved ${rows ? rows.length : 0} rows from sheet`);
        
        if (!rows || rows.length === 0) {
            console.log('⚠️  No data found in sheet');
            return;
        }
        
        // Process the raw sheet data for the specific site
        const siteConfig = processSiteConfig(rows, targetSite);
        
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


