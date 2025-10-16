import getTotalItemsCount from "../micro/getTotalItemsCount.js";
import logToLocalSheet from "../../../2_data/persistence/sheet/logToLocalSheet.js";
import scraperIssuesReporter, { SCRAPER_STATES } from "../../../../scripts/scraper_issue_reporter.js";

export default async function updateTotalItemsToBeCallected({ page, siteUrls }) {
    const { totalItemsToBeCallected } = logToLocalSheet() || {};
    const previousTotalItemsToBeCallected = totalItemsToBeCallected || 0;

    const { count: totalItemsToBeCallectedCount, selector: totalItemsSelector } =
        await getTotalItemsCount(page, siteUrls.configurations[0]?.totalProductCounterSelector);

    logToLocalSheet({
        totalItemsToBeCallected: totalItemsToBeCallectedCount + previousTotalItemsToBeCallected,
        totalItemsSelector
    });

    if (totalItemsToBeCallectedCount > 1) {
        console.log(SCRAPER_STATES.TOTAL_ITEMS_TO_BE_CALLECTED_MORE_THAN_ONE)
    }
    else if (totalItemsToBeCallectedCount < 1) {
        await scraperIssuesReporter({
            SCRAPER_ISSUE: SCRAPER_STATES.TOTAL_ITEMS_TO_BE_CALLECTED_LESS_THAN_ONE,
            page,
            url: page.url(),
            error: new Error('Total items to be collected is less than one')
        });
    }
}