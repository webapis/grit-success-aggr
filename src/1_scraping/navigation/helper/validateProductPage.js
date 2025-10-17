import dotenv from "dotenv";
import productItemSelector from "../../../config/selectors/selector-attibutes/productItemSelector.js";
import priceSelector from "../../../config/selectors/selector-attibutes/priceSelector.js";
import titleSelector from "../../../config/selectors/selector-attibutes/titleSelector.js";
import imageSelector from "../../../config/selectors/selector-attibutes/imageSelector.js";
import linkSelector from "../../../config/selectors/selector-attibutes/linkSelector.js";

import findCandidateProductItemSelector from "../micro/findBestSelector.js";
import logToLocalSheet from "../../../2_data/persistence/sheet/logToLocalSheet.js";
import scraperIssuesReporter, { SCRAPER_STATES } from "../../../../scripts/scraper_issue_reporter.js";

dotenv.config({ silent: true });
const site = process.env.site;

export default async function validateProductPage({ page, siteUrls }) {
    page.on("console", (message) => {
        //  console.log("Message from Puppeteer page:", message.text());
    });
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    await delay(5000); // wait for 5 seconds

    const candidateProductItemSelector = await findCandidateProductItemSelector(page, productItemSelector);

    // Count elements for each selector type
    const elementCounts = await page.evaluate((selectors) => {
        const counts = {
            price: 0,
            title: 0,
            image: 0,
            link: 0
        };

        // Helper function to count elements for an array of selectors
        const countElements = (selectorArray) => {
            let maxCount = 0;
            for (const selector of selectorArray) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > maxCount) {
                        maxCount = elements.length;
                    }
                } catch (e) {
                    // Invalid selector, skip it
                    continue;
                }
            }
            return maxCount;
        };

        counts.price = countElements(selectors.priceSelector);
        counts.title = countElements(selectors.titleSelector);
        counts.image = countElements(selectors.imageSelector);
        counts.link = countElements(selectors.linkSelector);

        return counts;
    }, {
        priceSelector,
        titleSelector,
        imageSelector,
        linkSelector
    });

    // Log element counts
    console.log('Element Counts:', elementCounts);
    console.log('Price elements:', elementCounts.price);
    console.log('Title elements:', elementCounts.title);
    console.log('Image elements:', elementCounts.image);
    console.log('Link elements:', elementCounts.link);
    console.log('Candidate Product Items:', candidateProductItemSelector.count);

    // Find the minimum count among price, image, link, title
    const minElementCount = Math.min(
        elementCounts.price,
        elementCounts.title,
        elementCounts.image,
        elementCounts.link
    );

    console.log('Minimum element count:', minElementCount);

    // Determine which element type has the minimum count
    const minElementType = Object.entries(elementCounts).find(([key, value]) => value === minElementCount)?.[0];
    console.log('Element type with minimum count:', minElementType);

    // Validate if candidateProductItem is a direct parent list container
    let isValidParentContainer = true;
    if (candidateProductItemSelector.count < minElementCount) {
        debugger
        isValidParentContainer = false;
        console.log('⚠️ WARNING: candidateProductItem count is less than minimum element count');
        console.log(`candidateProductItem (${candidateProductItemSelector.count}) < ${minElementType} (${minElementCount})`);
        console.log('candidateProductItem is NOT considered a direct parent list container element');
    } else {
        debugger
        console.log('✓ candidateProductItem appears to be a valid parent container');
        console.log(`candidateProductItem (${candidateProductItemSelector.count}) >= ${minElementType} (${minElementCount})`);
    }



    if (candidateProductItemSelector.count > 0) {
        console.log(SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_FOUND);

        const totalItemsPerPage = candidateProductItemSelector['count'];

        // Log all counts to sheet
        logToLocalSheet({
            totalItemsPerPage,
    
        });

        logToLocalSheet({ productItemSelector: candidateProductItemSelector.selector });

        // If not a valid parent container, log warning
        if (!isValidParentContainer) {
            debugger
            await scraperIssuesReporter({
                SCRAPER_ISSUE: SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_A_PARENT_CONTAINER,
                page,
                url: page.url(),
                error: new Error(`candidateProductItem count (${candidateProductItemSelector.count}) is less than minimum element count (${minElementCount})`)
            });
        }

    } else {
        console.log(SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND);

        await scraperIssuesReporter({
            SCRAPER_ISSUE: SCRAPER_STATES.PRODUCT_ITEMS_CANDIDATE_SELECTOR_NOT_FOUND,
            page,
            url: page.url(),
            error: new Error(candidateProductItemSelector.error || 'No valid product item selector found')
        });
    }

 
}