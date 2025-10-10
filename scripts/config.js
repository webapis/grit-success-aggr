import fs from 'fs';
import { getSiteConfig, getCachedSiteConfigFromFile, processCachedSheetData } from '../../src/config/siteConfig.js';
import logToLocalSheet from '../../src/2_data/persistence/sheet/logToLocalSheet.js';
import { emitAsync } from '../../src/shared/events.js';

export async function getConfig(site) {
    let siteConfig = null;

    // Strategy 1: Use cached file data (prioritized in GitHub Actions)
    if (process.env.GET_LOCAL_SITE_CONF === 'TRUE' || process.env.GITHUB_ACTIONS) {
        console.log('Attempting to use cached site configuration...');
        siteConfig = await getCachedSiteConfigFromFile();

        if (siteConfig) {
            console.log('✅ Successfully loaded cached site configuration');
            // If cached data contains raw sheet data, process it for the specific site
            if (siteConfig.data && !siteConfig.targetSite) {
                console.log('Processing raw sheet data for specific site...');
                siteConfig = processCachedSheetData(siteConfig, site);
            }
        } else {
            console.log('⚠️  No cached configuration found, will fetch from Google Sheets');
        }
    }

    // Strategy 2: Fallback to direct Google Sheets API call
    if (!siteConfig) {
        console.log('Fetching fresh configuration from Google Sheets API...');
        // Pass forceRefresh=true to ensure it bypasses any in-memory cache and hits the API
        siteConfig = await getSiteConfig(site, true);
    }

    return siteConfig;
}

export async function validateConfig(siteConfig, site, githubRunUrl) {
    if (siteConfig.paused) {
        const pausedReason = siteConfig.pausedReason || 'No reason provided';
        logToLocalSheet({ Status: 'Paused', pausedReason });

        const rowData = {
            site,
            pausedReason,
            timestamp: new Date().toISOString(),
            githubRunUrl: githubRunUrl,
        };
        
        await emitAsync('log-to-sheet', {
            sheetTitle: 'paused-sites', // Specify a dedicated sheet for run summaries
            message: `Site ${site} is paused`,
            rowData,
        });
        if (process.env.GITHUB_OUTPUT) {
            fs.appendFileSync(process.env.GITHUB_OUTPUT, "status=paused\n");
        }
        console.log(`Site ${site} is paused from aggregating. Reason: ${pausedReason}`);
        return true;
    }

    if (!siteConfig.urls || siteConfig.urls.length === 0) {
        throw new Error(`No valid URLs found for site: ${site}.`);
    }
    return false;
}