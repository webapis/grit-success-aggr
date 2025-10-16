import { PuppeteerCrawler } from "crawlee";

import puppeteer from '../src/1_scraping/helpers/puppeteer-stealth.js';
import preNavigationHooks from "./helpers/preNavigationHooksProd2.js";
import { ForbiddenError, handleRequestFailure } from './failureHandler.js';
import { summarizeAndReportRun } from './runReporter.js';


import scraperIssuesReporter, { SCRAPER_STATES } from "./scraper_issue_reporter.js";
import { EarlyExitError } from "./refactored-crawl.js";

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
                const report = await scraperIssuesReporter({ SCRAPER_ISSUE: SCRAPER_STATES.FORBIDDEN_403, page, url: request.url });
                // Throw a custom error to be caught by the runCrawler function, allowing a graceful shutdown.
                throw new ForbiddenError('Site is protected by anti-bot measures.', request, report.screenshotUrl);
            } else if (error.message.includes('timeout')) {
                await scraperIssuesReporter({ SCRAPER_ISSUE: SCRAPER_STATES.TIMEOUT, page, url: request.url, error });
            }
        },

        // Minimal permanent failure logging for debugging
        failedRequestHandler: handleRequestFailure,
    });
}

export async function runCrawler(crawler, urlsToScrape, site, githubRunUrl) {
    try {
        const startTime = Date.now();
        const urls = Array.isArray(urlsToScrape) ? urlsToScrape : [urlsToScrape];
        await crawler.run(urls);
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        await summarizeAndReportRun({ stats: crawler.stats, duration, githubRunUrl });
    } catch (crawlerError) {
        if (crawlerError.name === 'ForbiddenError') {
            console.log(`🚫 Crawl stopped due to 403 Forbidden error at ${crawlerError.request.url}. The issue has been reported.`);

            // Throw a specific error that the main pipeline can catch for a graceful exit.
            throw new EarlyExitError(`Crawl stopped due to 403 Forbidden error at ${crawlerError.request.url}`);
        } else {
            // Use the centralized reporter for fatal errors.
            await scraperIssuesReporter({
                SCRAPER_ISSUE: SCRAPER_STATES.CRAWLER_CRASH,
                error: crawlerError
            });
            throw crawlerError; // Re-throw to allow higher-level error handling
        }
    }
}