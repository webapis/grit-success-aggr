import { emitAsync } from './src/events.js';
import './src/listeners.js'; // ← This registers event handlers
import { PuppeteerCrawler } from "crawlee";
import { createRouter } from "./prodRoutesPuppeteer.js"; // Import factory function
import preNavigationHooks from "./crawler-helper/preNavigationHooksProd2.js";
import puppeteer from './crawler-helper/puppeteer-stealth.js';
import { getSiteConfig, getCachedSiteConfigFromFile } from './src/helper/siteConfig.js';

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
        //  const siteConfig =await getSiteConfig(site, true);
        const siteConfig = process.env.GET_LOCAL_SITE_CONF === 'TRUE' ? await getCachedSiteConfigFromFile() : await getSiteConfig(site, true);
        debugger

        if (!siteConfig) {
            console.error(`Could not retrieve configuration for site: ${site}. Exiting.`);
            process.exit(1);
        }

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

            // OPTION 1: Handle failed requests with errorHandler
            errorHandler: async ({ request, error }) => {
                console.error(`❌ Request failed for URL: ${request.url}`);
                console.error(`Error: ${error.message}`);

                // Check if it's a 403 error specifically
                if (error.message.includes('403 status code')) {
                    console.log('🚫 Detected 403 Forbidden error - possible anti-bot protection');

                }

                // You can also handle other specific errors here
                if (error.message.includes('timeout')) {
                    console.log('⏰ Request timeout detected');
                }
            },

            // OPTION 2: Handle failed requests that exceed retry limit
            failedRequestHandler: async ({ request, error }) => {
                console.error(`💀 Request permanently failed after all retries: ${request.url}`);
                console.error(`Final error: ${error.message}`);

            },

            // OPTION 3: Custom retry condition to handle 403 differently
            retryOnBlocked: false, // Disable default retry on blocked requests

            // OPTION 4: Custom request retry logic
            maxRequestRetries: 2, // Reduce retries for blocked requests

        });


        // Run crawler with error handling
        try {
            await crawler.run(siteConfig.urls);
            console.log(`✅ Crawler completed for site: ${site}`);

            // OPTION 6: Check crawler statistics for errors
            const stats = await crawler.stats;
            if (stats.requestsFailed > 0) {
                console.log(`⚠️  Crawler completed with ${stats.requestsFailed} failed requests`);


            }

        } catch (crawlerError) {
            console.error('❌ Crawler execution failed:', crawlerError);

        }

    } catch (error) {
        console.error('💥 Fatal error in main execution:', error);




        process.exit(1);
    }
})();