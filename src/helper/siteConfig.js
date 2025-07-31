// siteConfig.js - Site Configuration Module
import { google } from 'googleapis';
import getMainDomainPart from './src/scrape-helpers/getMainDomainPart.js';

// Environment variables for Google Sheets access
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Global variable to cache site configuration
global.siteConfigCache = null;

/**
 * Validates if a string is a valid URL
 * @param {string} string - The string to validate
 * @returns {boolean} True if valid URL, false otherwise
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
 * Fetches site URLs and pause status from a Google Sheet.
 * @param {string} targetSite - The site name to look for in the sheet.
 * @returns {Promise<Object|null>} An object containing site URLs, paused status, and reason, or null if not found.
 */
async function fetchSiteUrlsFromGoogleSheet(targetSite) {
    // Validate required environment variables
    if (!GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        console.error('Error: GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set.');
        return null;
    }
    if (!GOOGLE_SHEET_ID) {
        console.error('Error: GOOGLE_SHEET_ID environment variable is not set.');
        return null;
    }
    if (!targetSite) {
        console.error('Error: targetSite parameter is required.');
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

        // Fetch data from the 'wbags' sheet, columns A to F
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'wbags!A:F',
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            console.log('No data found in the Google Sheet.');
            return null;
        }

        if (rows.length < 2) {
            console.log('No data rows found in the Google Sheet (only header present).');
            return null;
        }

        // Validate header structure (optional but recommended)
        const headerRow = rows[0];
        const expectedHeaders = ['brands', 'funcPageSelector', 'isAutoScroll', 'urls', 'paused', 'pausedReason'];
        
        // Log header validation (optional - can be removed in production)
        if (headerRow && headerRow.length >= 4) {
            console.log('Sheet headers detected:', headerRow);
        }

        // Expected columns based on your sheet:
        // A: brands, B: funcPageSelector, C: isAutoScroll, D: urls, E: paused, F: pausedReason
        const dataRows = rows.slice(1); // Skip header row

        let allUrls = [];
        let paused = false;
        let pausedReason = '';
        let foundBrand = false;

        console.log(`Searching for URLs with domain containing: "${targetSite}" in ${dataRows.length} data rows`);
        console.log('Raw sheet data:');
        dataRows.forEach((row, index) => {
            console.log(`  Row ${index + 2}:`, JSON.stringify(row));
        });

        for (const [index, row] of dataRows.entries()) {
            console.log(`\nProcessing Row ${index + 2}:`);
            console.log(`  Raw row data:`, JSON.stringify(row));
            
            const urlsString = row[3] || ''; // URLs are in column D (index 3)
            console.log(`  URLs string: "${urlsString}"`);
            
            if (urlsString.trim()) {
                // Parse URLs from this row
                const rowUrls = urlsString
                    .split(',')
                    .map(url => url.trim())
                    .filter(url => url !== '')
                    .filter(url => {
                        const isValid = isValidUrl(url);
                        if (!isValid) {
                            console.warn(`  Invalid URL found and skipped: ${url}`);
                        }
                        return isValid;
                    });

                console.log(`  Valid URLs in this row: ${rowUrls.length}`, rowUrls);

                // Check each URL to see if its domain matches our target site
                const matchingUrls = rowUrls.filter(url => {
                    try {
                        const mainDomain = getMainDomainPart(url);
                        const matches = mainDomain.toLowerCase().includes(targetSite.toLowerCase());
                        console.log(`    URL: ${url} -> domain: ${mainDomain} -> matches "${targetSite}": ${matches}`);
                        return matches;
                    } catch (error) {
                        console.warn(`    Error extracting domain from ${url}:`, error.message);
                        return false;
                    }
                });

                if (matchingUrls.length > 0) {
                    console.log(`  ✓ Found ${matchingUrls.length} matching URLs in row ${index + 2}`);
                    foundBrand = true;
                    
                    console.log(`  Current total URLs before adding: ${allUrls.length}`);
                    allUrls.push(...matchingUrls);
                    console.log(`  Current total URLs after adding: ${allUrls.length}`);
                    console.log(`  All URLs so far:`, allUrls);

                    // Parse paused status and reason (take from first occurrence)
                    if (!paused) { // Only set if not already set
                        const pausedValue = row[4] ? row[4].trim().toLowerCase() : '';
                        paused = pausedValue === 'true' || pausedValue === '1' || pausedValue === 'yes';
                        pausedReason = row[5] ? row[5].trim() : '';
                        console.log(`  Paused status: ${paused}, Reason: "${pausedReason}"`);
                    }
                }
            }
        }

        if (!foundBrand) {
            console.log(`No URLs found with domain containing "${targetSite}" in the Google Sheet.`);
            return null;
        }

        if (allUrls.length === 0) {
            console.error(`No valid URLs found with domain containing "${targetSite}"`);
            return null;
        }

        console.log(`Found configuration for site "${targetSite}":`, {
            urls: allUrls,
            paused: paused,
            pausedReason: pausedReason,
            totalUrls: allUrls.length
        });

        return {
            urls: allUrls,
            paused: paused,
            pausedReason: pausedReason,
        };

    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error.message);
        console.error('Full error:', error);
        return null;
    }
}

/**
 * Gets site configuration from cache or fetches from Google Sheets
 * @param {string} targetSite - The site name to look for
 * @param {boolean} forceRefresh - Force refresh from Google Sheets even if cached
 * @returns {Promise<Object|null>} Site configuration object
 */
async function getSiteConfig(targetSite, forceRefresh = false) {
    // Return cached config if available and not forcing refresh
    if (global.siteConfigCache && !forceRefresh) {
        console.log(`Using cached configuration for site: ${targetSite}`);
        return global.siteConfigCache;
    }

    console.log(`Fetching fresh configuration for site: ${targetSite}`);
    const config = await fetchSiteUrlsFromGoogleSheet(targetSite);
    
    if (config) {
        // Cache the configuration globally
        global.siteConfigCache = config;
        console.log(`Configuration cached globally for site: ${targetSite}`);
    }
    
    return config;
}

/**
 * Clears the cached site configuration
 */
function clearSiteConfigCache() {
    global.siteConfigCache = null;
    console.log('Site configuration cache cleared');
}

/**
 * Gets the currently cached site configuration without making API calls
 * @returns {Object|null} Cached site configuration or null if not cached
 */
function getCachedSiteConfig() {
    return global.siteConfigCache;
}

// Export functions
export {
    getSiteConfig,
    fetchSiteUrlsFromGoogleSheet,
    clearSiteConfigCache,
    getCachedSiteConfig
};