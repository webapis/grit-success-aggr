import fs from 'fs';
import { emitAsync } from '../src/shared/events.js';
import getGitHubActionsRunUrl from '../src/shared/getGitHubActionsRunUrl.js';
import { uploadScreenshot } from '../src/2_data/persistence/uploadScreenshot.js';

const site = process.env.site;

const SCRAPER_ISSUES = {
    CRAWLER_CRASH: 'CRAWLER_CRASH', // A generic fatal error during the crawl

      NO_VALID_URLS: 'NO_VALID_URLS',//NO VALID URLS FOUND
    NO_VALID_SITE: 'NO_VALID_SITE',//MISSPELLED SITE NAME
      PAUSED_FORM_SCRAPING: 'PAUSED_FORM_SCRAPING',
    PARTIAL_FORBIDDEN_403: 'PARTIAL_FORBIDDEN_403',
    UNREACHABLE_SITE: 'UNREACHABLE_SITE',// SITE IS TEMPORARILY DOWN
    REDIRECTION: 'REDIRECTION',//PAGE GETS REDIRECTED
      FORBIDDEN_403: 'FORBIDDEN_403',//PAGE GETS BLOCKED,
    ANTIBOT_DETECTION: 'ANTIBOT_DETECTION',//PAGE IS BEING PREVENTED FROM SCRAPING
    FORBIDDEN_IMAGE_403: 'FORBIDDEN_IMAGE_403',
    PAGE_NOT_FOUND_404: 'PAGE_NOT_FOUND_404',
    TIMEOUT: 'TIMEOUT',
    NAVIGATION_TIMEOUT: 'NAVIGATION_TIMEOUT',
    SCROLLING_TIMEOUT: 'SCROLLING_TIMEOUT',//TIME GIVEN TO SCROLLING EXPIRES BEFORE SCROLLING IS FINISHED, OR INFINIT SCROLLING IS HAPPENING

    //NO SELECTOR WAS PROVIDED
    MISSING_PRICE_SELECTOR: 'MISSING_PRICE_SELECTOR',
    MISSING_TITLE_SELECTOR: 'MISSING_TITLE_SELECTOR',
    MISSING_IMAGE_SELECTOR: 'MISSING_IMAGE_SELECTOR',
    MISSING_LINK_SELECTOR: "MISSING_LINK_SELECTOR",
    MISSING_PRODUCT_ITEMS_SELECTOR: 'MISSING_PRODUCT_ITEMS_SELECTOR',
    //SELECTOR IS PROVIDED BUT IT IS NOT FOUND BY DOM QUIERY
    UNFOUND_PRICE_SELECTOR: 'UNFOUND_PRICE_SELECTOR',//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_TITLE_SELECTOR: 'UNFOUND_TITLE_SELECTOR',//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_LINK_SELECTOR: 'UNFOUND_LINK_SELECTOR',//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_IMAGE_SELECTOR: 'UNFOUND_IMAGE_SELECTOR',//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_ITEM_COUNT_SELECTOR: 'UNFOUND_ITEM_COUNT_SELECTOR',//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_PAGINATION_SELECTOR: 'UNFOUND_PAGINATION_SELECTOR',//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_PRODUCT_ITEMS_SELECTOR: 'UNFOUND_PRODUCT_ITEMS_SELECTOR',//PROBABLY NOT A PRODUCT PAGE OR WRONG SELECTOR PROVIDED
    //SELECTOR IS FOUND BUT NO DATA IS PRESENT
    INVALID_PRICE_SELECTOR: 'INVALID_PRICE_SELECTOR',//EMPTY OR NULL VALUE
    INVALID_TITLE_SELECTOR: 'INVALID_TITLE_SELECTOR',//EMPTY OR NULL VALUE
    INVALID_LINK_SELECTOR: 'INVALID_LINK_SELECTOR',//EMPTY OR NULL VALUE
    INVALID_IMAGE_SELECTOR: 'INVALID_IMAGE_SELECTOR',//EMPTY OR NULL VALUE
    INVALID_PRODUCT_ITEMS_SELECTOR: 'INVALID_PRODUCT_ITEMS_SELECTOR',//0 LENGTH
    //DATA IS RETRIEVED BUT FORMAT IS INVALID
    INVALID_PRICE_FORMAT: 'INVALID_PRICE_FORMAT',//CONTAINES CHAR NOT RELATED TO PRICE
    INVALID_TITLE_FORMAT: 'INVALID_TITLE_FORMAT',//CONTAINS CHAR NOT RELATED TO TITLE
    INVALID_LINK_FORMAT: 'INVALID_LINK_FORMAT',//EMPTY OR NULL
    INVALID_IMAGE_EXT: 'INVALID_IMAGE_EXT',// CONTAINES IMAGES WITH EXTENTIONS CONSIDERED NOT A PRODUCT IMAGE
    INVALID_IMAGE_URL_FORMAT: 'INVALID_IMAGE_URL_FORMAT',//EMPTY OR NULL
    INVALID_PRICE_CURRENCY: 'INVALID_PRICE_CURRENCY',//EMPTY OR NULL
    //BECAUSE OF WRONG SELECTOR QUERY THE SAME INFORMATION IS ASSIGNED TO ALL ITEM PROPERTIES
    ITEMS_WITH_DOUBLICATE_LINKS: 'ITEMS_WITH_DOUBLICATE_LINKS',
    ITEMS_WITH_DOUBLICATE_IMAGES: 'ITEMS_WITH_DOUBLICATE_IMAGES',
    ITEMS_WITH_DOUBLICATE_PRICES: 'ITEMS_WITH_DOUBLICATE_PRICES',
    ITEMS_WITH_DOUBLICATE_TITLES: 'ITEMS_WITH_DOUBLICATE_TITLES',
    //PRODUCT ITEM SELECTOR IS USED BY NONE PRODUCT ITEM ALONGSIDE PRODUCT ITEMS
    NO_PRODUCT_ITEMS: 'NO_PRODUCT_ITEMS',
    //ITEMS NOT ITENTIFIED BY CATEGORIZATION PROCESS
    UNCATEGORIZED_ITEMS: 'UNCATEGORIZED_ITEMS',
    //ITEMS COLORS OF WHICH NO IDENTIFIED
    ITEMS_WITHOUT_COLOR: 'ITEMS_WITHOUT_COLOR'

}


const githubRunUrl = getGitHubActionsRunUrl();
const branch = process.env.GITHUB_REF_NAME || 'local';

export default async function scraperIssuesReporter({ SCRAPER_ISSUE, url, urls, pausedReason, page, error }) {
    let screenshotUrl = null;
    let failureReason = null;
    let failureType = null;
    let statusOutput = 'paused';
    let sheetTitle = 'crawler-failures'


    let rowData = {
        site: site,
        url: url || 'N/A',
        timestamp: new Date().toISOString(),
        githubRunUrl: githubRunUrl,
        screenshotUrl: screenshotUrl || 'N/A',
        branch,
        failureReason,
        failureType,
    };
    switch (SCRAPER_ISSUE) {
        case SCRAPER_ISSUES.NO_VALID_URLS:

            failureReason = ` no valid urls found for site ${site}: ${urls}`
            failureType = SCRAPER_ISSUES.NO_VALID_URLS
          

            break;
        case SCRAPER_ISSUES.NO_VALID_SITE:
            ''
            break;

        case SCRAPER_ISSUES.PAUSED_FORM_SCRAPING:
            failureReason = `${pausedReason}`
            failureType = SCRAPER_ISSUES.PAUSED_FORM_SCRAPING
            sheetTitle = 'paused-sites'
      
            rowData = { ...rowData, failureReason, failureType }
            break;
        case SCRAPER_ISSUES.PARTIAL_FORBIDDEN_403:

            break;
        case SCRAPER_ISSUES.UNREACHABLE_SITE:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_ISSUES.REDIRECTION:

            break;
        case SCRAPER_ISSUES.FORBIDDEN_403:
            failureReason = `Blocked with 403 Forbidden status at ${url}`;
            failureType = SCRAPER_ISSUES.FORBIDDEN_403;
            statusOutput = 'paused';
            screenshotUrl = await uploadScreenshot(page, site); 
            rowData = { ...rowData, screenshotUrl, failureReason, failureType };
            break;
        case SCRAPER_ISSUES.ANTIBOT_DETECTION:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_ISSUES.FORBIDDEN_IMAGE_403:

            break;
        case SCRAPER_ISSUES.PAGE_NOT_FOUND_404:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_ISSUES.TIMEOUT:
            failureReason = `Request timed out at ${url}: ${error.message}`;
            failureType = SCRAPER_ISSUES.TIMEOUT;
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl, failureReason, failureType };
            break;
        case SCRAPER_ISSUES.NAVIGATION_TIMEOUT:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_ISSUES.CRAWLER_CRASH:
            failureReason = `Crawler crashed with a fatal error: ${error.message}`;
            failureType = SCRAPER_ISSUES.CRAWLER_CRASH;
            statusOutput = 'fatal_error';
            // A generic crash might not have a page context, so a screenshot is not possible.
            // The URL will also be 'N/A' unless passed in.
            rowData = { ...rowData, failureReason, failureType };
            break;

        case SCRAPER_ISSUES.NO_PRODUCT_ITEMS:
            failureReason = `No product items found on page ${url}. possible reason is wrong css selector or not product page`
            failureType = SCRAPER_ISSUES.NO_PRODUCT_ITEMS
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, failureReason, failureType, screenshotUrl }
            break;
    }

    await emitAsync('log-to-sheet', {
        sheetTitle,
        message: `Site ${site} failed: ${failureReason}`,
        rowData,
    });

    if (process.env.GITHUB_OUTPUT && statusOutput) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${statusOutput}\n`);
    }
    process.exit(0);

    return { screenshotUrl };
}



export { SCRAPER_ISSUES }