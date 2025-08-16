//https://claude.ai/chat/053a7f18-a1d1-48a5-aa28-f1551328a939
import { emitAsync } from './src/events.js';
import './src/listeners.js'; // ← This registers event handlers
import { PuppeteerCrawler } from "crawlee";
import { createRouter } from "./prodRoutesPuppeteer.js"; // Import factory function
import preNavigationHooks from "./crawler-helper/preNavigationHooksProd2.js";
import puppeteer from './crawler-helper/puppeteer-stealth.js';
import { getSiteConfig, getCachedSiteConfigFromFile } from './src/helper/siteConfig.js';
import baseRowData from './src/route/micro/baseRowData.js';
import { processScrapedData } from './src/pushToGit.js';
const site = process.env.site;
const local = process.env.local;
const HEADLESS = process.env.HEADLESS;

debugger
// Main execution block
(async () => {
    try {
        if (!site) {
            console.error('Error: site environment variable is not set.');
            process.exit(1);
        }

        debugger
        console.log(`Fetching configuration for site: ${site}`);

        // Enhanced configuration retrieval logic
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
                    const { processCachedSheetData } = await import('./src/helper/siteConfig.js');
                    siteConfig = processCachedSheetData(siteConfig, site);
                }
            } else {
                console.log('⚠️  No cached configuration found, will fetch from Google Sheets');
            }
        }

        // Strategy 2: Fallback to direct Google Sheets API call
        if (!siteConfig) {
            console.log('Fetching fresh configuration from Google Sheets API...');
            siteConfig = await getSiteConfig(site, true);
        }

        debugger

        if (!siteConfig) {
            console.error(`Could not retrieve configuration for site: ${site}. Exiting.`);
            process.exit(1);
        }

        console.log(`Configuration loaded for site: ${site}`, {
            totalUrls: siteConfig.totalUrls || siteConfig.urls?.length,
            paused: siteConfig.paused,
            scrollable: siteConfig.scrollable,
            itemsPerPage: siteConfig.itemsPerPage,
            cachedAt: siteConfig.cachedAt || 'not cached'
        });

        // Check if site is paused
        if (siteConfig.paused) {
            const logData = {
                sheetTitle: 'paused-sites',
                message: `Site ${site} is paused from aggregating. Reason: ${siteConfig.pausedReason || 'No reason provided'}`,
                rowData: {
                    site,
                    status: 'Paused',
                    pausedReason: siteConfig.pausedReason || 'No reason provided',
                    timestamp: new Date().toISOString(),
                }
            };

            await emitAsync('log-to-sheet', logData);
            console.log(`Site ${site} is paused from aggregating. Reason: ${siteConfig.pausedReason || 'No reason provided'}`);
            process.exit(0);
        }

        // Validate URLs before starting crawler
        if (!siteConfig.urls || siteConfig.urls.length === 0) {
            console.error(`No valid URLs found for site: ${site}. Exiting.`);
            process.exit(1);
        }

        console.log(`Starting crawler for site: ${site} with ${siteConfig.urls.length} URLs`);
        console.log('URLs to crawl:', siteConfig.urls);
        console.log('Site configuration:', {
            paginationSelector: siteConfig.paginationSelector,
            scrollable: siteConfig.scrollable,
            itemsPerPage: siteConfig.itemsPerPage,
            filteringNeeded: siteConfig.filteringNeeded
        });

        // Create router with siteConfig
        const router = await createRouter(siteConfig);

        // Initialize and run crawler
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
                    ],
                    protocolTimeout: 300000,
                }
            },
            requestHandler: router,

            // Retry configuration
            maxRequestRetries: 2,
            retryOnBlocked: false,

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
            maxRequestRetries: 2,
        });

        // Run crawler with comprehensive end-of-task logging
        try {
            const startTime = Date.now();
            await crawler.run(siteConfig.urls);
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000);

            // Get crawler statistics
            const stats = await crawler.stats;
            const totalRequests = stats.requestsTotal;
            const successfulRequests = totalRequests - stats.requestsFailed;
            const isSuccess = stats.requestsFailed === 0;

            console.log(`✅ Crawler completed for site: ${site} in ${duration} seconds`);
            console.log(`Stats: ${successfulRequests}/${totalRequests} successful, ${stats.requestsFailed} failed`);
            const result = await processScrapedData(site);
            // Single comprehensive log entry with complete summary
            await emitAsync('log-to-sheet', {
                sheetTitle: isSuccess ? 'Crawl Logs(success)' : 'Crawl Logs(error)',
                message: `Site ${site} crawling completed`,
                rowData: {
                    ...result,
                    Site: site,
                    Status: isSuccess ? 'Success' : 'Partial Success',
                    TotalURLs: totalRequests,
                    SuccessfulURLs: successfulRequests,
                    FailedURLs: stats.requestsFailed,
                    Duration: `${duration}s`,
                    Notes: isSuccess
                        ? 'All URLs processed successfully'
                        : `${stats.requestsFailed} URLs failed out of ${totalRequests}`,
                    ConfigSource: siteConfig.cachedAt ? 'Cached' : 'Fresh API',
                    Timestamp: new Date().toISOString()
                }
            });

        } catch (crawlerError) {
            console.error('❌ Crawler execution failed:', crawlerError);

            // Log fatal crawler error.
            await emitAsync('log-to-sheet', {
                sheetTitle: 'Crawl Logs(error)',
                message: `Site ${site} crawler failed fatally`,
                rowData: {
                    ...baseRowData,
                    Site: site,
                    Status: 'Fatal Error',
                    Notes: `Crawler crashed: ${crawlerError.message}`,
                    ConfigSource: siteConfig.cachedAt ? 'Cached' : 'Fresh API',
                    Timestamp: new Date().toISOString()
                }
            });

            throw crawlerError; // Re-throw to maintain error handling behavior
        }

    } catch (error) {
        console.error('💥 Fatal error in main execution:', error);

        // Log fatal main execution error
        await emitAsync('log-to-sheet', {
            sheetTitle: 'Crawl Logs(error)',
            message: `Site ${site} main execution failed`,
            rowData: {
                ...baseRowData,
                Site: site,
                Status: 'Fatal Error',
                Notes: `Main execution failed: ${error.message}`,
                ConfigSource: 'Unknown',
                Timestamp: new Date().toISOString()
            }
        });

        process.exit(1);
    }
})();