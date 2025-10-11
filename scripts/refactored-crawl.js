import { createRouter } from "./routes-puppeteer.js";
import logToLocalSheet from '../src/2_data/persistence/sheet/logToLocalSheet.js';
import getGitHubActionsRunUrl from '../src/shared/getGitHubActionsRunUrl.js';
import { getConfig, validateConfig } from './config.js';
import { prepareUrls } from './urls.js';
import { initializeCrawler, runCrawler } from './crawler.js';
import { pipe } from './pipe.js';

import '../src/shared/listeners.js'; // This registers the event handlers

// Custom error for controlled pipeline exits
class EarlyExitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EarlyExitError';
    }
}

// --- Pipeline Stages ---

const initializeContext = async (context) => {
    const site = process.env.site;
    const branch = process.env.GITHUB_REF_NAME || 'local';
    const githubRunUrl = getGitHubActionsRunUrl();

    console.log(`🚀 Starting crawler for site: ${site}${branch !== 'local' ? ` on branch: ${branch}` : ''}`);
    console.log(githubRunUrl ? `GitHub Actions Run URL: ${githubRunUrl}` : 'Not running in GitHub Actions');
    logToLocalSheet({ GitHubRunUrl: githubRunUrl, Site: site, Branch: branch });

    if (!site) {
        throw new Error('site environment variable is not set.');
    }

    return { ...context, site, branch, githubRunUrl };
};

const fetchConfiguration = async (context) => {
    console.log(`Fetching configuration for site: ${context.site}`);
    const siteConfig = await getConfig(context.site);

    if (!siteConfig || !siteConfig.configurations || siteConfig.configurations.length === 0) {
        throw new Error(`Could not retrieve a valid configuration for site: ${context.site}.`);
    }

    const mainConfig = siteConfig.configurations[0];
    console.log(`Configuration loaded for site: ${context.site}`, {
        totalUrls: siteConfig.totalUrls || siteConfig.urls?.length,
        paused: siteConfig.paused,
        scrollable: mainConfig.scrollable,
        cachedAt: siteConfig.cachedAt || 'not cached'
    });

    return { ...context, siteConfig };
};

const validateConfiguration = async (context) => {
    if (await validateConfig(context.siteConfig, context.site, context.githubRunUrl)) {
        throw new EarlyExitError('Validation logic determined an early exit is needed.');
    }
    return context;
};

const prepareCrawlUrls = (context) => {
    const urlsToScrape = prepareUrls(context.siteConfig, context.site);

    console.log(`Starting crawler for site: ${context.site} with ${urlsToScrape.length} valid URLs`);
    console.log('Valid URLs to crawl:', urlsToScrape);
    console.log('Site configuration:', {
        paginationSelector: context.siteConfig.configurations[0].paginationSelector,
        scrollable: context.siteConfig.configurations[0].scrollable,
        itemsPerPage: context.siteConfig.configurations[0].itemsPerPage,
        filteringNeeded: context.siteConfig.configurations[0].filteringNeeded
    });

    return { ...context, urlsToScrape };
};

const setupCrawler = async (context) => {
    const router = await createRouter(context.siteConfig);
    const crawler = initializeCrawler(router);
    return { ...context, crawler };
};

const executeCrawl = async (context) => {
    await runCrawler(context.crawler, context.urlsToScrape, context.site, context.githubRunUrl);
    return { ...context, completed: true };
};

// --- Pipeline Definition ---

const crawlPipeline = pipe(
    initializeContext,
    fetchConfiguration,
    validateConfiguration,
    prepareCrawlUrls,
    setupCrawler,
    executeCrawl
);

// Main execution block
async function main() {
    try {
        const result = await crawlPipeline({});
        if (result.completed) {
            console.log(`✅ Crawler for site ${result.site} finished successfully.`);
        }
    } catch (error) {
        if (error instanceof EarlyExitError) {
            console.log(`➡️ Pipeline exited early: ${error.message}`);
            // This is a controlled exit, not a fatal error.
        } else {
            console.error('💥 Fatal error in main execution:', error);
            logToLocalSheet({ Status: 'Fatal Error', Notes: `Main execution failed: ${error.message}` });
            process.exit(1);
        }
    }
}

main();
