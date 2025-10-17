import getTotalItemsCount from "../micro/getTotalItemsCount.js";
import logToLocalSheet from "../../../2_data/persistence/sheet/logToLocalSheet.js";

export default async function updateTotalItemsToBeCallected({ page, siteUrls }) {
    const { totalItemsToBeCallected } = logToLocalSheet() || {};
    const previousTotalItemsToBeCallected = totalItemsToBeCallected || 0;

    const { count: totalItemsToBeCallectedCount, selector: totalItemsSelector } =
        await getTotalItemsCount(page, siteUrls.configurations[0]?.totalProductCounterSelector);

    logToLocalSheet({
        totalItemsToBeCallected: totalItemsToBeCallectedCount + previousTotalItemsToBeCallected,
        totalItemsSelector
    });

 
}