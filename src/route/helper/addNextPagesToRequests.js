import dotenv from "dotenv";

import commonExcludedPatterns from "../../selector-attibutes/commonExcludedPatterns.js";
import paginationPostfix from "../../selector-attibutes/paginationPostfix.js";

import getNextPaginationUrls from "../../scrape-helpers/getNextPaginationUrls.js";
import continueIfProductPage from "./continueIfProductPage.js";

dotenv.config({ silent: true });




export default async function addNextPagesToRequests({ page, addRequests, siteUrls }) {
    //next pages

const shouldContinue = await continueIfProductPage({ page, siteUrls });
if (!shouldContinue) return []; // 🛑 Don't proceed if no product items


    const url = await page.url();


    if (
        siteUrls.funcPageSelector &&
        url.length > 0 &&
        paginationPostfix.every(sub => !url.includes(sub))
    ) {

       // const foundpaginationPostfix = paginationPostfix.find(sub => !url.includes(sub))
        debugger
        const nextPages = await getNextPaginationUrls(page, url, siteUrls.funcPageSelector, siteUrls.paginationPostfix);


        debugger;

        if (nextPages.length > 0) {

            const cleanedPatterns = siteUrls.excludeUrlPatterns ? [...commonExcludedPatterns, ...siteUrls.excludeUrlPatterns.map(p => p.replace(/\*/g, ''))] : commonExcludedPatterns
            const filtered = nextPages
                .filter(url => !cleanedPatterns.some(pattern => url.toLowerCase().includes(pattern)))
                .map(url => ({ url: url.replace('??', '?'), label: 'second' }));

            console.log('filtered', filtered);
            await addRequests(filtered);

        }
    }
}
