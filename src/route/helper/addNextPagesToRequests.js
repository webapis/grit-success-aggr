import dotenv from "dotenv";
import getNextPaginationUrls from "../../scrape-helpers/getNextPaginationUrls.js";
import continueIfProductPage from "./continueIfProductPage.js";

dotenv.config({ silent: true });




export default async function addNextPagesToRequests({ page, addRequests, siteUrls }) {
    //next pages

// const shouldContinue = await continueIfProductPage({ page, siteUrls });
// if (!shouldContinue) return []; // 🛑 Don't proceed if no product items

    const url = await page.url();

    if (
 
        url.length > 0 
    
    ) {


        debugger
        const nextPages = await getNextPaginationUrls(page, url, siteUrls);


        if (nextPages.length > 0) {

  
            const filtered = nextPages
           
                .map(url => ({ url: url.replace('??', '?'), label: 'second' }));

            console.log('filtered', filtered);
            await addRequests(filtered);

        }
    }
}
