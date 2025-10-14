import fs from 'fs';
import { emitAsync } from '../src/shared/events.js';
import getGitHubActionsRunUrl from '../src/shared/getGitHubActionsRunUrl.js';
import { uploadScreenshot } from '../src/2_data/persistence/uploadScreenshot.js';

const site = process.env.site;

const SCRAPER_ISSUES = {

    NO_VALID_URLS,
    NO_VALID_SITE,//MISSPELLED SITE NAME
    PAUSED_FORM_SCRAPING,
    PARTIAL_FORBIDDEN_403,
    UNREACHABLE_SITE,// SITE IS TEMPORARILY DOWN
    REDIRECTION,//PAGE GETS REDIRECTED
    FORBIDDEN_403,//PAGE GETS BLOCKED,
    ANTIBOT_DETECTION,//PAGE IS BEING PREVENTED FROM SCRAPING
    FORBIDDEN_IMAGE_403,
    PAGE_NOT_FOUND_404,
    TIMEOUT,
    NAVIGATION_TIMEOUT,
    SCROLLING_TIMEOUT,//TIME GIVEN TO SCROLLING EXPIRES BEFORE SCROLLING IS FINISHED, OR INFINIT SCROLLING IS HAPPENING

    //NO SELECTOR WAS PROVIDED
    MISSING_PRICE_SELECTOR,
    MISSING_TITLE_SELECTOR,
    MISSING_IMAGE_SELECTOR,
    MISSING_LINK_SELECTOR,
    MISSING_PRODUCT_ITEMS_SELECTOR,
    //SELECTOR IS PROVIDED BUT IT IS NOT FOUND BY DOM QUIERY
    UNFOUND_PRICE_SELECTOR,//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_TITLE_SELECTOR,//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_LINK_SELECTOR,//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_IMAGE_SELECTOR,//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_ITEM_COUNT_SELECTOR,//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_PAGINATION_SELECTOR,//PROBABLY  WRONG SELECTOR PROVIDED
    UNFOUND_PRODUCT_ITEMS_SELECTOR,//PROBABLY NOT A PRODUCT PAGE OR WRONG SELECTOR PROVIDED
    //SELECTOR IS FOUND BUT NO DATA IS PRESENT
    INVALID_PRICE_SELECTOR,//EMPTY OR NULL VALUE
    INVALID_TITLE_SELECTOR,//EMPTY OR NULL VALUE
    INVALID_LINK_SELECTOR,//EMPTY OR NULL VALUE
    INVALID_IMAGE_SELECTOR,//EMPTY OR NULL VALUE
    INVALID_PRODUCT_ITEMS_SELECTOR,//0 LENGTH
    //DATA IS RETRIEVED BUT FORMAT IS INVALID
    INVALID_PRICE_FORMAT,//CONTAINES CHAR NOT RELATED TO PRICE
    INVALID_TITLE_FORMAT,//CONTAINS CHAR NOT RELATED TO TITLE
    INVALID_LINK_FORMAT,//EMPTY OR NULL
    INVALID_IMAGE_EXT,// CONTAINES IMAGES WITH EXTENTIONS CONSIDERED NOT A PRODUCT IMAGE
    INVALID_IMAGE_URL_FORMAT,//EMPTY OR NULL
    INVALID_PRICE_CURRENCY,//EMPTY OR NULL
    //BECAUSE OF WRONG SELECTOR QUERY THE SAME INFORMATION IS ASSIGNED TO ALL ITEM PROPERTIES
    ITEMS_WITH_DOUBLICATE_LINKS,
    ITEMS_WITH_DOUBLICATE_IMAGES,
    ITEMS_WITH_DOUBLICATE_PRICES,
    ITEMS_WITH_DOUBLICATE_TITLES,
    //PRODUCT ITEM SELECTOR IS USED BY NONE PRODUCT ITEM ALONGSIDE PRODUCT ITEMS
    NONE_PRODUCT_ITEMS,
    //ITEMS NOT ITENTIFIED BY CATEGORIZATION PROCESS
    UNCATEGORIZED_ITEMS,
    //ITEMS COLORS OF WHICH NO IDENTIFIED
    ITEMS_WITHOUT_COLOR

}


const githubRunUrl = getGitHubActionsRunUrl();
const branch = process.env.GITHUB_REF_NAME || 'local';

export default async function scraperIssuesReporter({ SCRAPER_ISSUE, url, urls }) {
    let screenshotUrl = null;
    let failureReason = null;
    let failureType = null;
    let statusOutput = '';

    switch (SCRAPER_ISSUE) {
        case SCRAPER_ISSUES.NO_VALID_URLS:

            failureReason = ` no valid urls found for site ${site}: ${urls}}`
            failureType = SCRAPER_ISSUES.NO_VALID_URLS
            statusOutput = 'paused'

            break;
        case SCRAPER_ISSUES.NO_VALID_SITE:
            ''
            break;

        case SCRAPER_ISSUES.PAUSED_FORM_SCRAPING:

            break;
        case SCRAPER_ISSUES.PARTIAL_FORBIDDEN_403:

            break;
        case SCRAPER_ISSUES.UNREACHABLE_SITE:
            screenshotUrl = await uploadScreenshot(page, site);
            break;
        case SCRAPER_ISSUES.REDIRECTION:

            break;
        case SCRAPER_ISSUES.FORBIDDEN_403:
            screenshotUrl = await uploadScreenshot(page, site);
            break;
        case SCRAPER_ISSUES.ANTIBOT_DETECTION:
            screenshotUrl = await uploadScreenshot(page, site);
            break;
        case SCRAPER_ISSUES.FORBIDDEN_IMAGE_403:

            break;
        case SCRAPER_ISSUES.PAGE_NOT_FOUND_404:
            screenshotUrl = await uploadScreenshot(page, site);
            break;
        case SCRAPER_ISSUES.TIMEOUT:
            screenshotUrl = await uploadScreenshot(page, site);
            break;
        case SCRAPER_ISSUES.NAVIGATION_TIMEOUT:
            screenshotUrl = await uploadScreenshot(page, site);
            break;

    }


    const rowData = {
        site: site,
        url: url || 'N/A',
        timestamp: new Date().toISOString(),
        githubRunUrl: githubRunUrl,
        screenshotUrl: screenshotUrl || 'N/A',
        branch,
        failureReason,
        failureType,
    };


    await emitAsync('log-to-sheet', {
        sheetTitle: 'crawler-failures',
        message: `Site ${site} failed: ${failureReason}`,
        rowData,
    });

    if (process.env.GITHUB_OUTPUT && statusOutput) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${statusOutput}\n`);
    }
}



export { SCRAPER_ISSUES }