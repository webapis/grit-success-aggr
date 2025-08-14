
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
        const siteConfig = process.env.GET_LOCAL_SITE_CONF==='TRUE' ? await getCachedSiteConfigFromFile() : await getSiteConfig(site, true);
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
            maxConcurrency: 1,
            preNavigationHooks,
            navigationTimeoutSecs: 120,
            headless: HEADLESS === "false" ? false : true,
            requestHandlerTimeoutSecs: 600000,
            // maxRequestsPerCrawl: 50
        });

        await crawler.run(siteConfig.urls);
        console.log(`Crawler completed for site: ${site}`);

    } catch (error) {
        console.error('Fatal error in main execution:', error);
        process.exit(1);
    }
})();