// siteConfig.js - Site Configuration Module with enhanced caching
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import getMainDomainPart from '../shared/getMainDomainPart.js';

// Environment variables for Google Sheets access
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'wbags-scroll';

// Define paths for cache files
const LOCAL_CACHE_FILE = path.resolve(process.cwd(), 'siteConfig.json');
const SHARED_SHEET_CACHE = path.resolve(process.cwd(), 'siteConfig.json'); // Same file for GitHub Actions caching

// Global variable to cache site configuration
global.siteConfigCache = null;

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
 * Processes cached sheet data to extract site configuration
 */
function processCachedSheetData(sheetData, targetSite) {
    const rows = sheetData.data;
    
    if (!rows || rows.length === 0) {
        console.log('No data found in cached sheet data.');
        return null;
    }

    if (rows.length < 2) {
        console.log('No data rows found in cached sheet data (only header present).');
        return null;
    }

    const dataRows = rows.slice(1); // Skip header row
    let allUrls = [];
    let siteConfigurations = [];
    let foundBrand = false;
debugger
    console.log(`Processing cached data for site: "${targetSite}"`);

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
                    return mainDomain.toLowerCase()===targetSite.toLowerCase()
                } catch (error) {
                    console.warn(`Error extracting domain from ${url}:`, error.message);
                    return false;
                }
            });

            if (matchingUrls.length > 0) {
                foundBrand = true;
debugger
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
        console.log(`No URLs found for site "${targetSite}" in cached data.`);
        return null;
    }

    // Build final configuration
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
        cachedAt: sheetData.timestamp || new Date().toISOString()
    };
}

/**
 * Loads cached sheet data and checks if it's still valid
 */
async function loadCachedSheetData() {
    try {
        const data = await fs.readFile(SHARED_SHEET_CACHE, 'utf8');
        const cachedData = JSON.parse(data);
        
        // Check if cache is still valid (less than 1 hour old)
        const cacheAge = Date.now() - new Date(cachedData.timestamp).getTime();
        const maxCacheAge = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (cacheAge < maxCacheAge) {
            console.log(`Using cached sheet data (${Math.round(cacheAge / 60000)} minutes old)`);
            return cachedData;
        } else {
            console.log(`Cached sheet data is too old (${Math.round(cacheAge / 60000)} minutes), will fetch fresh data`);
            return null;
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No cached sheet data found.');
        } else {
            console.error('Error loading cached sheet data:', error.message);
        }
        return null;
    }
}

/**
 * Fetches site URLs and configuration from Google Sheet (original function)
 */
async function fetchSiteUrlsFromGoogleSheet(targetSite) {
    // ... (keep the original implementation as fallback)
    // This is your existing fetchSiteUrlsFromGoogleSheet function
    // I'll keep it unchanged for brevity
    console.log('Fetching fresh data from Google Sheets API...');
    // [Your existing implementation here]
}

/**
 * Gets site configuration with enhanced caching strategy
 */
async function getSiteConfig(targetSite, forceRefresh = false) {
    
    // Return in-memory cache if available and not forcing refresh
    if (global.siteConfigCache && !forceRefresh) {
        console.log(`Using in-memory cached configuration for site: ${targetSite}`);
        return global.siteConfigCache;
    }

    // Try to use shared cached sheet data first (GitHub Actions cache)
    if (!forceRefresh) {
        const cachedSheetData = await loadCachedSheetData();
        if (cachedSheetData) {
            const config = processCachedSheetData(cachedSheetData, targetSite);
            if (config) {
                global.siteConfigCache = config;
                console.log(`Using cached sheet data for site: ${targetSite}`);
                return config;
            }
        }
    }

    // Fallback to direct Google Sheets API call
    console.log(`Fetching fresh configuration for site: ${targetSite} from Google Sheets API`);
    const config = await fetchSiteUrlsFromGoogleSheet(targetSite);

    if (config) {
        global.siteConfigCache = config;
        console.log(`Configuration fetched and cached for site: ${targetSite}`);
    }

    return config;
}

/**
 * Saves raw sheet data to cache (for use by GitHub Actions)
 */
async function saveCachedSheetData(sheetData) {
    try {
        const cacheData = {
            timestamp: new Date().toISOString(),
            runId: process.env.GITHUB_RUN_ID || 'local',
            data: sheetData
        };
        
        await fs.writeFile(SHARED_SHEET_CACHE, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(`Sheet data cached to ${SHARED_SHEET_CACHE}`);
    } catch (error) {
        console.error('Error saving cached sheet data:', error.message);
    }
}

/**
 * Clears all cached data
 */
async function clearSiteConfigCache() {
    global.siteConfigCache = null;
    try {
        await fs.unlink(LOCAL_CACHE_FILE);
        console.log('Site configuration cache cleared');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error clearing cache:', error.message);
        }
    }
}

/**
 * Gets the currently cached site configuration by reading it directly from the local file.
 * This function will always attempt to read from the file.
 * @returns {Promise<Object|null>} The site configuration object from the file or null if not found/error.
 */
async function getCachedSiteConfigFromFile() {
    console.log(`Attempting to retrieve configuration directly from local file: ${LOCAL_CACHE_FILE}`);
    return await loadSiteConfigFromFile();
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

// Export functions
export {
    getSiteConfig,
    fetchSiteUrlsFromGoogleSheet,
    clearSiteConfigCache,
    processCachedSheetData,
    loadCachedSheetData,
    saveCachedSheetData,
    getCachedSiteConfigFromFile,
    saveSiteConfigToFile,
    loadSiteConfigFromFile
};