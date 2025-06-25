import { emitAsync } from './src/events.js';
import './src/listeners.js'; // ← This registers event handlers

import { PuppeteerCrawler } from "crawlee";
import { router } from "./prodRoutesPuppeteer.js";
import preNavigationHooks from "./crawler-helper/preNavigationHooksProd2.js";
import puppeteer from './crawler-helper/puppeteer-stealth.js';

import urls from './sites/products/urls.json' assert { type: 'json' };

const site = process.env.site;
const local = process.env.local;

const HEADLESS = process.env.HEADLESS;

const siteUrls = urls.find(f => f.site === site)

if (siteUrls.paused) {

 await emitAsync('log-to-sheet', {
  sheetTitle: 'paused-sites', 
  message:  console.log(`Site ${site} is paused from aggregating. Exiting...`),
  rowData: {
    site,
    status: 'Paused',
    pausedReason: siteUrls.pausedReason || 'No reason provided', 
    timestamp: new Date().toISOString(),
  } 
});
process.exit(0);
} else {
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
        ]
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

  crawler.run(siteUrls.urls);

}


