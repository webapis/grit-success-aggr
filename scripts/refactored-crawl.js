import { createRouter } from "./routes-puppeteer.js";
import logToLocalSheet from '../src/2_data/persistence/sheet/logToLocalSheet.js';
import getGitHubActionsRunUrl from '../src/shared/getGitHubActionsRunUrl.js';
import { getConfig, validateConfig } from './crawler-helpers/config.js';
import { prepareUrls } from './crawler-helpers/urls.js';
import { initializeCrawler, runCrawler } from './crawler-helpers/crawler.js';
import '../src/shared/listeners.js'; // This registers the event handlers

const site = process.env.site;
const GITHUB_BRANCH = process.env.GITHUB_REF_NAME; // Get branch name from GitHub Actions env

// Main execution block
async function main() {
    // Get GitHub Actions run URL early for consistent logging
    const githubRunUrl = getGitHubActionsRunUrl();
    console.log(`🚀 Starting crawler for site: ${site}${GITHUB_BRANCH ? ` on branch: ${GITHUB_BRANCH}` : ''}`);
    console.log(githubRunUrl ? `GitHub Actions Run URL: ${githubRunUrl}` : 'Not running in GitHub Actions');
    logToLocalSheet({ GitHubRunUrl: githubRunUrl, Site: site, Branch: GITHUB_BRANCH || 'local' });

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

        if (await validateConfig(siteConfig, site, githubRunUrl)) {
            return;
        }

        const urlsToScrape = prepareUrls(siteConfig, site);

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

        const crawler = initializeCrawler(router);

        await runCrawler(crawler, urlsToScrape, site, githubRunUrl);

    } catch (error) {
        console.error('💥 Fatal error in main execution:', error);
        logToLocalSheet({ Status: 'Fatal Error', Notes: `Main execution failed: ${error.message}` });
        process.exit(1);
    }
}

main();
