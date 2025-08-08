// siteConfig.js - Site Configuration Module
import { google } from 'googleapis';
import fs from 'fs/promises'; // Import Node.js file system promises API
import path from 'path';     // Import Node.js path module
import getMainDomainPart from './getMainDomainPart.js';

// Environment variables for Google Sheets access
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Define a path for the local cache file
const LOCAL_CACHE_FILE = path.resolve(process.cwd(), 'siteConfig.json');

// Global variable to cache site configuration (still used by getSiteConfig for in-memory caching)
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
 * Parses scrollBehavior from the sheet value
 * @param {string} value - The raw value from the sheet
 * @returns {string|Array|boolean} Parsed scrollBehavior value
 */
function parseScrollBehavior(value) {
    if (!value || typeof value !== 'string') {
        return '';
    }

    const trimmedValue = value.trim();
    
    // Handle empty string
    if (!trimmedValue) {
        return '';
    }

    // Handle boolean true (case-insensitive)
    if (trimmedValue.toLowerCase() === 'true') {
        return [true];
    }

    // Handle boolean false (case-insensitive)
    if (trimmedValue.toLowerCase() === 'false') {
        return '';
    }

    // Try to parse as JSON array
    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
        try {
            const parsed = JSON.parse(trimmedValue);
            if (Array.isArray(parsed)) {
                // Validate array format
                if (parsed.length === 1 && parsed[0] === true) {
                    return [true];
                } else if (parsed.length === 2 && 
                          typeof parsed[0] === 'string' && 
                          typeof parsed[1] === 'boolean') {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn(`Failed to parse scrollBehavior as JSON array: ${trimmedValue}`, error.message);
        }
    }

    // If it's not a recognized format, treat as empty (no scrolling)
    console.warn(`Unrecognized scrollBehavior format: "${trimmedValue}", treating as no scrolling`);
    return '';
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

        // Fetch data from the 'wbags' sheet, columns A to G
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'wbags!A:G',
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
        const expectedHeaders = ['brands', 'funcPageSelector', 'scrollBehavior', 'urls', 'paginationPostfix', 'paused', 'pausedReason'];

        // Log header validation (optional - can be removed in production)
        if (headerRow && headerRow.length >= 4) {
            console.log('Sheet headers detected:', headerRow);
        }

        // Expected columns based on your sheet:
        // A: brands, B: funcPageSelector, C: scrollBehavior, D: urls, E: paginationPostfix, F: paused, G: pausedReason
        const dataRows = rows.slice(1); // Skip header row

        let allUrls = [];
        let siteConfigurations = [];
        let foundBrand = false;

        console.log(`Searching for URLs with domain containing: "${targetSite}" in ${dataRows.length} data rows`);
        console.log('Raw sheet data:');
        dataRows.forEach((row, index) => {
            console.log(`   Row ${index + 2}:`, JSON.stringify(row));
        });

        for (const [index, row] of dataRows.entries()) {
            console.log(`\nProcessing Row ${index + 2}:`);
            console.log(`   Raw row data:`, JSON.stringify(row));

            const urlsString = row[3] || ''; // URLs are in column D (index 3)
            console.log(`   URLs string: "${urlsString}"`);

            if (urlsString.trim()) {
                // Parse URLs from this row
                const rowUrls = urlsString
                    .split(',')
                    .map(url => url.trim())
                    .filter(url => url !== '')
                    .filter(url => {
                        const isValid = isValidUrl(url);
                        if (!isValid) {
                            console.warn(`   Invalid URL found and skipped: ${url}`);
                        }
                        return isValid;
                    });

                console.log(`   Valid URLs in this row: ${rowUrls.length}`, rowUrls);

                // Check each URL to see if its domain matches our target site
                const matchingUrls = rowUrls.filter(url => {
                    try {
                        const mainDomain = getMainDomainPart(url);
                        const matches = mainDomain.toLowerCase().includes(targetSite.toLowerCase());
                        console.log(`     URL: ${url} -> domain: ${mainDomain} -> matches "${targetSite}": ${matches}`);
                        return matches;
                    } catch (error) {
                        console.warn(`     Error extracting domain from ${url}:`, error.message);
                        return false;
                    }
                });

                if (matchingUrls.length > 0) {
                    console.log(`   ✓ Found ${matchingUrls.length} matching URLs in row ${index + 2}`);
                    foundBrand = true;

                    // Parse scrollBehavior from column C (index 2)
                    const scrollBehavior = parseScrollBehavior(row[2]);
                    console.log(`   Parsed scrollBehavior: ${JSON.stringify(scrollBehavior)}`);

                    // Create configuration object for this row
                    const rowConfig = {
                        brand: row[0] ? row[0].trim() : '',
                        funcPageSelector: row[1] ? JSON.parse(row[1].trim()) : '',
                        scrollBehavior: scrollBehavior,
                        urls: matchingUrls,
                        paginationPostfix: row[4] ? row[4].trim() : '',
                        paused: row[5] ? row[5].trim().toLowerCase() === 'true' : false,
                        pausedReason: row[6] ? row[6].trim() : '',
                        rowIndex: index + 2 // For reference
                    };

                    console.log(`   Row configuration:`, rowConfig);
                    siteConfigurations.push(rowConfig);

                    console.log(`   Current total URLs before adding: ${allUrls.length}`);
                    allUrls.push(...matchingUrls);
                    console.log(`   Current total URLs after adding: ${allUrls.length}`);
                    console.log(`   All URLs so far:`, allUrls);
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

        // Determine overall paused status (if ANY matching row is paused, consider the site paused)
        const isPaused = siteConfigurations.some(config => config.paused);
        const pausedReason = siteConfigurations.find(config => config.paused)?.pausedReason || '';

        const finalConfig = {
            targetSite: targetSite,
            urls: allUrls,
            totalUrls: allUrls.length,
            paused: isPaused,
            pausedReason: pausedReason,
            configurations: siteConfigurations, // All matching row configurations
            // Convenience properties (from first matching configuration)
            funcPageSelector: siteConfigurations[0]?.funcPageSelector || '',
            scrollBehavior: siteConfigurations[0]?.scrollBehavior || '',
            paginationPostfix: siteConfigurations[0]?.paginationPostfix || '',
        };

        console.log(`Found configuration for site "${targetSite}":`, finalConfig);

        return finalConfig;

    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error.message);
        console.error('Full error:', error);
        return null;
    }
}

/**
 * Saves the site configuration to a local JSON file.
 * @param {Object} config - The site configuration object to save.
 */
async function saveSiteConfigToFile(config) {
    try {
        await fs.writeFile(LOCAL_CACHE_FILE, JSON.stringify(config, null, 2), 'utf8');
        console.log(`Site configuration saved to ${LOCAL_CACHE_FILE}`);
    } catch (error) {
        console.error('Error saving site configuration to file:', error.message);
    }
}

/**
 * Loads the site configuration from a local JSON file.
 * @returns {Promise<Object|null>} The loaded site configuration object or null if not found/error.
 */
async function loadSiteConfigFromFile() {
    try {
        const data = await fs.readFile(LOCAL_CACHE_FILE, 'utf8');
        const config = JSON.parse(data);
        console.log(`Site configuration loaded from ${LOCAL_CACHE_FILE}`);
        return config;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No local site configuration file found.');
        } else {
            console.error('Error loading site configuration from file:', error.message);
        }
        return null;
    }
}

/**
 * Gets site configuration from cache, local file, or fetches from Google Sheets
 * @param {string} targetSite - The site name to look for
 * @param {boolean} forceRefresh - Force refresh from Google Sheets even if cached or local file exists
 * @returns {Promise<Object|null>} Site configuration object
 */
async function getSiteConfig(targetSite, forceRefresh = false) {
    // Return cached in-memory config if available and not forcing refresh
    if (global.siteConfigCache && !forceRefresh) {
        console.log(`Using in-memory cached configuration for site: ${targetSite}`);
        return global.siteConfigCache;
    }

    // Attempt to load from local file if not forcing refresh
    if (!forceRefresh) {
        const localConfig = await loadSiteConfigFromFile();
        if (localConfig) {
            global.siteConfigCache = localConfig; // Update in-memory cache for getSiteConfig's efficiency
            console.log(`Using local file configuration for site: ${targetSite} (and updated in-memory cache)`);
            return localConfig;
        }
    }

    console.log(`Fetching fresh configuration for site: ${targetSite}`);
    const config = await fetchSiteUrlsFromGoogleSheet(targetSite);

    if (config) {
        // Cache the configuration globally in memory
        global.siteConfigCache = config;
        console.log(`Configuration cached in memory for site: ${targetSite}`);

        // Save the configuration to a local file
        await saveSiteConfigToFile(config);
    }

    return config;
}

/**
 * Clears the cached site configuration (both in-memory and local file)
 */
async function clearSiteConfigCache() {
    global.siteConfigCache = null; // Clear in-memory cache
    try {
        await fs.unlink(LOCAL_CACHE_FILE); // Delete the local file
        console.log('Site configuration cache (in-memory and local file) cleared');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No local site configuration file to clear.');
        } else {
            console.error('Error clearing local site configuration file:', error.message);
        }
    }
}

/**
 * Gets the currently cached site configuration by *reading it directly from the local file*.
 * This function will always attempt to read from the file.
 * @returns {Promise<Object|null>} The site configuration object from the file or null if not found/error.
 */
async function getCachedSiteConfigFromFile() { // Renamed for clarity
    console.log(`Attempting to retrieve configuration directly from local file: ${LOCAL_CACHE_FILE}`);
    return await loadSiteConfigFromFile();
}

// Export functions
export {
    getSiteConfig,
    fetchSiteUrlsFromGoogleSheet,
    clearSiteConfigCache,
    // Export the new function that explicitly reads from the file
    getCachedSiteConfigFromFile,
    // You can keep the old one if needed, but it's less direct now
    // getCachedSiteConfig: () => global.siteConfigCache,
    saveSiteConfigToFile,
    loadSiteConfigFromFile
};