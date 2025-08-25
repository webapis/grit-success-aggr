import dotenv from "dotenv";
import getNextPaginationUrls from "../../scrape-helpers/getNextPaginationUrls.js";


dotenv.config({ silent: true });




export default async function addNextPagesToRequests({ page, addRequests, siteUrls,url }) {

  

    if (
 
        url.length > 0 
    
    ) {


        debugger
        const nextPages = await getNextPaginationUrls(page, url, siteUrls);
        debugger

        if (nextPages.length > 0) {

  
            const filtered = nextPages
           
                .map(url => ({ url: url.replace('??', '?'), label: 'second' }));

            console.log('filtered', filtered);
            await addRequests(filtered);

        }
    }
}
