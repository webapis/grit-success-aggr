import { PuppeteerCrawler } from "crawlee";
import fs from 'fs';
import puppeteer from '../src/1_scraping/helpers/puppeteer-stealth.js';
import preNavigationHooks from "./helpers/preNavigationHooksProd2.js";
import { ForbiddenError, handleRequestFailure, handleForbiddenError } from './failureHandler.js';
import { summarizeAndReportRun } from './runReporter.js';
import { emitAsync } from '../src/shared/events.js';
import logToLocalSheet from '../src/2_data/persistence/sheet/logToLocalSheet.js';

export function initializeCrawler(router) {
    const local = process.env.local;
    const HEADLESS = process.env.HEADLESS;

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
                    '--lang=tr-TR,tr',
                    '--ignore-certificate-errors' // Add argument to ignore SSL errors
                ],
                ignoreHTTPSErrors: true, // <-- This will ignore SSL certificate errors
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
        errorHandler: async ({ request, error, page }) => {
            console.error(`❌ Request failed on attempt ${request.retryCount + 1}: ${request.url} - ${error.message}`);
            if (error.message.includes('403 status code')) {
                await handleForbiddenError({ request, page });
            } else if (error.message.includes('timeout')) {
                console.log('⏰ Request timeout detected');
            }
        },

        // Minimal permanent failure logging for debugging
        failedRequestHandler: handleRequestFailure,
    });
}

export async function runCrawler(crawler, urlsToScrape, site, githubRunUrl) {
    try {
        const startTime = Date.now();
        await crawler.run(urlsToScrape);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        await summarizeAndReportRun({ stats: crawler.stats, duration, githubRunUrl });
    } catch (crawlerError) {
        if (crawlerError.name === 'ForbiddenError') {
            console.log(`🚫 Site is protected by anti-bot measures (403 Forbidden) at ${crawlerError.request.url}. Stopping crawl.`);

            const rowData = {
                site: site,
                url: crawlerError.request.url,
                timestamp: new Date().toISOString(),
                githubRunUrl: githubRunUrl,
                screenshotUrl: crawlerError.screenshotUrl || 'N/A',
                reason: 'Blocked with 403 Forbidden status',
                failureType: '403 Forbidden',
            };
            await emitAsync('log-to-sheet', { sheetTitle: 'crawler-failures', message: `Site ${site} is blocked.`, rowData });

            if (process.env.GITHUB_OUTPUT) {
                fs.appendFileSync(process.env.GITHUB_OUTPUT, "status=paused\n");
            }
        } else {
            console.error('❌ Crawler execution failed:', crawlerError);
            logToLocalSheet({ Status: 'Fatal Error', Notes: `Crawler crashed: ${crawlerError.message}` });
            throw crawlerError; // Re-throw to allow higher-level error handling
        }
    }
}