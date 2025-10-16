import dotenv from "dotenv";
import productItemSelector from "../../../config/selectors/selector-attibutes/productItemSelector.js";
import findCandidateProductItemSelector from "../micro/findBestSelector.js";
import { uploadImage } from "../../../shared/git/uploadImage.js";

import logToLocalSheet from "../../../2_data/persistence/sheet/logToLocalSheet.js";
import scraperIssuesReporter, { SCRAPER_STATES } from "../../../../scripts/scraper_issue_reporter.js";

dotenv.config({ silent: true });
const site = process.env.site;

export default async function prepareProductPage({ page, siteUrls }) {
    page.on("console", (message) => {
        //  console.log("Message from Puppeteer page:", message.text());
    });
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    await delay(5000); // wait for 5 seconds


    const candidateProductItemSelector = await findCandidateProductItemSelector(page, productItemSelector);

    debugger
    const { debug } = logToLocalSheet() || {};
    if (candidateProductItemSelector.count > 0) {
        console.log(SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_FOUND)
        // Safely extract with default 0



        const totalItemsPerPage = candidateProductItemSelector['count'];
        logToLocalSheet({ totalItemsPerPage });

        logToLocalSheet({ productItemSelector: candidateProductItemSelector.selector });

        if (totalItemsPerPage < 1) {
            await scraperIssuesReporter({
                SCRAPER_ISSUE: SCRAPER_STATES.TOTAL_ITEMS_TO_BE_CALLECTED_LESS_THAN_ONE,
                page,
                url: page.url(),
                error: new Error('Total items to be collected is less than one')
            });
        }



        return true;
    } else {

        console.log(SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND)

        await scraperIssuesReporter({
            SCRAPER_ISSUE: SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND,
            page,
            url: page.url(),
            error: new Error(candidateProductItemSelector.error || 'No valid product item selector found')
        });



        return false;
    }
}
