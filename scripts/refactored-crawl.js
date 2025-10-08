
import { PuppeteerCrawler } from "crawlee";
import fs from 'fs';
import { createRouter } from "./routes-puppeteer.js"; // Import factory function
import preNavigationHooks from "./helpers/preNavigationHooksProd2.js";
import puppeteer from '../src/1_scraping/helpers/puppeteer-stealth.js';
import { getSiteConfig, getCachedSiteConfigFromFile } from '../src/config/siteConfig.js';
import logToLocalSheet from '../src/2_data/persistence/sheet/logToLocalSheet.js';
import getGitHubActionsRunUrl from '../src/shared/getGitHubActionsRunUrl.js';
import { validateUrls } from "./helpers/urlValidation.js";
import { emitAsync } from '../src/shared/events.js';
import '../src/shared/listeners.js'; // This registers the event handlers

const site = process.env.site;
const local = process.env.local;
const HEADLESS = process.env.HEADLESS;
const GITHUB_BRANCH = process.env.GITHUB_REF_NAME; // Get branch name from GitHub Actions env

// Function to generate GitHub Actions run URL


const GitHubRunUrl = getGitHubActionsRunUrl()
console.log(`🚀 Starting crawler for site: ${site}${GITHUB_BRANCH ? ` on branch: ${GITHUB_BRANCH}` : ''}`);
logToLocalSheet({ GitHubRunUrl, Site: site, Branch: GITHUB_BRANCH || 'local' })


async function getConfig(site) {
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
                // Import the processing function
                const { processCachedSheetData } = await import('../src/config/siteConfig.js');
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


async function validateConfig(siteConfig) {
    if (siteConfig.paused) {
        const pausedReason = siteConfig.pausedReason || 'No reason provided';
        logToLocalSheet({ Status: 'Paused', pausedReason });

        const rowData = {
            site,
            pausedReason,
            timestamp: new Date().toISOString(),
            githubRunUrl: GitHubRunUrl,
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


function prepareUrls(siteConfig) {
    console.log('🔍 Validating URLs for specific paths...');
    const { validUrls, invalidUrls } = validateUrls(siteConfig.urls);

    if (invalidUrls.length > 0) {
        console.error(`Found ${invalidUrls.length} invalid URLs (root-only paths):`);
        invalidUrls.forEach(url => console.error(`  - ${url}`));

        logToLocalSheet({ Status: 'Validation Error', Notes: `Found ${invalidUrls.length} invalid URLs: ${invalidUrls.join(', ')}` })
        if (validUrls.length === 0) {
            throw new Error(`All URLs for site ${site} are invalid (contain only root paths).`);
        }
    }

    return validUrls;
}


function initializeCrawler(siteConfig, router) {
    return new PuppeteerCrawler({
        launchContext: {
            useChrome: local === 'true' ? true : false,
            launcher: puppeteer,
            launchOptions: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    '--lang=tr-TR,tr'
                ],
                protocolTimeout: 600000,
                timeout: 120000,
            }
        },
        requestHandler: router,

        // Retry configuration
        maxRequestRetries: 2,
        retryOnBlocked: false,
        maxConcurrency: 1,
        // Request configuration to avoid 403s
        sessionPoolOptions: {
            maxPoolSize: 10,
            sessionOptions: {
                maxUsageCount: 50,
            }
        },
        preNavigationHooks,
        navigationTimeoutSecs: 120,
        headless: HEADLESS === "false" ? false : true,
        requestHandlerTimeoutSecs: 600000,
        // maxRequestsPerCrawl: 50

        // Minimal error logging for debugging (no sheet logging)
        errorHandler: async ({ request, error }) => {
            console.error(`❌ Request failed: ${request.url} - ${error.message}`);

            // Log specific error types for debugging
            if (error.message.includes('403 status code')) {
                console.log('🚫 Detected 403 Forbidden error - possible anti-bot protection');
            } else if (error.message.includes('timeout')) {
                console.log('⏰ Request timeout detected');
            }
        },

        // Minimal permanent failure logging for debugging
        failedRequestHandler: async ({ request, error }) => {
            console.error(`💀 Permanently failed: ${request.url} - ${error.message}`);
        },

        retryOnBlocked: false,
    });
}


async function runCrawler(crawler, urlsToScrape) {
    try {
        const startTime = Date.now();
        await crawler.run(urlsToScrape);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        const stats = crawler.stats;
        const statsJson = stats.toJSON();
        const totalRequests = statsJson.requestsFinished;
        const successfulRequests = totalRequests - statsJson.requestsFailed;

        console.log(`✅ Crawler completed for site: ${site} in ${duration} seconds`);
        console.log(`Stats: ${successfulRequests}/${totalRequests} successful, ${statsJson.requestsFailed} failed`);

        logToLocalSheet({ Duration: duration });
    } catch (crawlerError) {
        console.error('❌ Crawler execution failed:', crawlerError);
        logToLocalSheet({ Status: 'Fatal Error', Notes: `Crawler crashed: ${crawlerError.message}` });
        throw crawlerError; // Re-throw to allow higher-level error handling
    }
}

// Main execution block





async function main() {
    // Get GitHub Actions run URL early for consistent logging
    const githubRunUrl = getGitHubActionsRunUrl();
    console.log(githubRunUrl ? `GitHub Actions Run URL: ${githubRunUrl}` : 'Not running in GitHub Actions');

    try {
        if (!site) {
            console.error('Error: site environment variable is not set.');
            process.exit(1);
        }


        console.log(`Fetching configuration for site: ${site}`);

        const siteConfig = await getConfig(site);



        if (!siteConfig || !siteConfig.configurations || siteConfig.configurations.length === 0) {
            console.error(`Could not retrieve a valid configuration for site: ${site}. Exiting.`);
            process.exit(1);
        }

        const mainConfig = siteConfig.configurations[0];

        console.log(`Configuration loaded for site: ${site}`, {
            totalUrls: siteConfig.totalUrls || siteConfig.urls?.length,
            paused: siteConfig.paused,
            scrollable: mainConfig.scrollable,
            itemsPerPage: mainConfig.itemsPerPage,
            cachedAt: siteConfig.cachedAt || 'not cached'
        });

        if (await validateConfig(siteConfig)) {
            return;
        }

        const urlsToScrape = prepareUrls(siteConfig);

        console.log(`Starting crawler for site: ${site} with ${urlsToScrape.length} valid URLs`);
        console.log('Valid URLs to crawl:', urlsToScrape);
        console.log('Site configuration:', {
            paginationSelector: mainConfig.paginationSelector,
            scrollable: mainConfig.scrollable,
            itemsPerPage: mainConfig.itemsPerPage,
            filteringNeeded: mainConfig.filteringNeeded
        });

        // Create router with siteConfig
        const router = await createRouter(siteConfig);

        const crawler = initializeCrawler(siteConfig, router);

        await runCrawler(crawler, urlsToScrape);

    } catch (error) {
        console.error('💥 Fatal error in main execution:', error);

        logToLocalSheet({ Status: 'Fatal Error', Notes: `Main execution failed: ${error.message}` });
        process.exit(1);
    }
}

main();
