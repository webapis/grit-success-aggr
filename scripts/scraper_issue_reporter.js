import fs from 'fs';
import { emitAsync } from '../src/shared/events.js';
import getGitHubActionsRunUrl from '../src/shared/getGitHubActionsRunUrl.js';
import { uploadScreenshot } from '../src/2_data/persistence/uploadScreenshot.js';

const site = process.env.site;

const SCRAPER_STATES = {
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

    PRODUCT_ITEMS_CANDIDATE_SELECTOR_FOUND: 'PRODUCT_ITEMS_CANDIDATE_SELECTOR_FOUND',//CANDIDATE PRODUCT ITEM SELECTOR FOUND
    PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND: 'PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND',//CANDIDATE PRODUCT ITEM SELECTOR NOT FOUND
    INVALID_PRODUCT_ITEMS_CANDIDATE_SELECTOR: 'INVALID_PRODUCT_ITEMS_CANDIDATE_SELECTOR', //CANDIDATE IS FOUND BUT LACKS CHILD ELEMENTS (PRICE, TITLE, ETC.)
    PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_A_PARENT_CONTAINER: 'PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_A_PARENT_CONTAINER',


    TOTAL_ITEMS_TO_BE_CALLECTED_MORE_THAN_ONE: 'TOTAL_ITEMS_TO_BE_CALLECTED_MORE_THAN_ONE',
    TOTAL_ITEMS_TO_BE_CALLECTED_LESS_THAN_FOUR: 'TOTAL_ITEMS_TO_BE_CALLECTED_LESS_THAN_FOUR',


    PRODUCT_ITEMS_NOT_FOUND: 'PRODUCT_ITEMS_SELECTOR_NOT_FOUND',//PROBABLY NOT A PRODUCT PAGE OR WRONG SELECTOR PROVIDED
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
    debugger
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
    let shouldExit = true;

    switch (SCRAPER_ISSUE) {
        case SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND:
            failureReason = `No product item candidate selector found on page ${url}.`;
            failureType = SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND;
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, failureReason, failureType, screenshotUrl };
            statusOutput = 'paused'; // or some other status
    
            debugger;
            break;
        case SCRAPER_STATES.INVALID_PRODUCT_ITEMS_CANDIDATE_SELECTOR:
            failureReason = `Product item candidate selector is invalid on page ${url}. ${error?.message}`;
            failureType = SCRAPER_STATES.INVALID_PRODUCT_ITEMS_CANDIDATE_SELECTOR;
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, failureReason, failureType, screenshotUrl };
            statusOutput = 'paused';
      
            break;
        case SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_A_PARENT_CONTAINER:
            failureReason = `Product item candidate selector is not a parent container on page ${url}. ${error?.message}`;
            failureType = SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_A_PARENT_CONTAINER;
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, failureReason, failureType, screenshotUrl };
            statusOutput = 'paused';
         
            break;

        case SCRAPER_STATES.TOTAL_ITEMS_TO_BE_CALLECTED_LESS_THAN_ONE:
            failureReason = `Total items to be collected is less than one on page ${url}.`;
            failureType = SCRAPER_STATES.TOTAL_ITEMS_TO_BE_CALLECTED_LESS_THAN_ONE;
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, failureReason, failureType, screenshotUrl };
            statusOutput = 'paused'; // or some other status
         
            break;
        case SCRAPER_STATES.NO_VALID_URLS:

            failureReason = ` no valid urls found for site ${site}: ${urls}`
            failureType = SCRAPER_STATES.NO_VALID_URLS


            break;
        case SCRAPER_STATES.NO_VALID_SITE:
            ''
            break;

        case SCRAPER_STATES.PAUSED_FORM_SCRAPING:
            failureReason = `${pausedReason}`
            failureType = SCRAPER_STATES.PAUSED_FORM_SCRAPING
            sheetTitle = 'paused-sites'

            rowData = { ...rowData, failureReason, failureType }
            break;
        case SCRAPER_STATES.PARTIAL_FORBIDDEN_403:

            break;
        case SCRAPER_STATES.UNREACHABLE_SITE:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_STATES.REDIRECTION:

            break;
        case SCRAPER_STATES.FORBIDDEN_403:
            failureReason = `Blocked with 403 Forbidden status at ${url}`;
            failureType = SCRAPER_STATES.FORBIDDEN_403;
            statusOutput = 'paused';
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl, failureReason, failureType };
            break;
        case SCRAPER_STATES.ANTIBOT_DETECTION:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_STATES.FORBIDDEN_IMAGE_403:

            break;
        case SCRAPER_STATES.PAGE_NOT_FOUND_404:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_STATES.TIMEOUT:
            failureReason = `Request timed out at ${url}: ${error.message}`;
            failureType = SCRAPER_STATES.TIMEOUT;
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl, failureReason, failureType };
            break;
        case SCRAPER_STATES.NAVIGATION_TIMEOUT:
            screenshotUrl = await uploadScreenshot(page, site);
            rowData = { ...rowData, screenshotUrl }
            break;
        case SCRAPER_STATES.CRAWLER_CRASH:
            failureReason = `Crawler crashed with a fatal error: ${error.message}`;
            failureType = SCRAPER_STATES.CRAWLER_CRASH;
            statusOutput = 'fatal_error';
            // A generic crash might not have a page context, so a screenshot is not possible.
            // The URL will also be 'N/A' unless passed in.
            rowData = { ...rowData, failureReason, failureType };
            break;

        case SCRAPER_STATES.NO_PRODUCT_ITEMS:
            failureReason = `No product items found on page ${url}. possible reason is wrong css selector or not product page`
            failureType = SCRAPER_STATES.NO_PRODUCT_ITEMS
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
    if (shouldExit) {
        process.exit(0);
    }

    return { screenshotUrl };
}



export { SCRAPER_STATES }