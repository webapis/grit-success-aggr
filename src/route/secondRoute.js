

import dotenv from "dotenv";
import scroller, { autoScroll } from "../scrape-helpers/scroller.js";
import urls from '../meta/urls.json' assert { type: 'json' };
import commonExcludedPatterns from "../selector-attibutes/commonExcludedPatterns.js";
import paginationPostfix from "../selector-attibutes/paginationPostfix.js";
import productPageSelector from "../selector-attibutes/productPageSelector.js";
import getMainDomainPart from "../scrape-helpers/getMainDomainPart.js";
import getNextPaginationUrls from "../scrape-helpers/getNextPaginationUrls.js";
import scrapeData from "./helper/scrapeData.js";
dotenv.config({ silent: true });

const site = process.env.site;
const siteUrls = urls.find(f => getMainDomainPart(f.urls[0]) === site)


export default async function second({
    page,
    isAutoScroll = false,
    breadcrumb = () => "",
    waitForSeconds = 0,
    addRequests,
}) {
    const url = await page.url();

    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });


    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1)); // Wait for specified seconds
        }, waitForSeconds);
    }

    //next pages
    if (
        siteUrls.funcPageSelector &&
        url.length > 0 &&
        paginationPostfix.every(sub => !url.includes(sub))
    ) {
        const foundpaginationPostfix = paginationPostfix.find(sub => !url.includes(sub))
        debugger
        const nextPages = await getNextPaginationUrls(page, url, siteUrls.funcPageSelector, foundpaginationPostfix);


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
    //-------------------------------------------------------------------------------------------------------------
    // Check if there are any product items on the page
    const productItemsCount = await page.$$eval(productPageSelector.join(', '), elements => elements.length);
    debugger
    if (productItemsCount > 0) {

        if (isAutoScroll) {
            console.log('autoscrolling')
            await autoScroll(page, 150)
        } else {
            //  await scroller(page, 150, 5);
        }


        const data = await scrapeData({ page })

        return data
    } else {
        console.log('not product page', url);
        return [];
    }


    //-------------------------------------------------------------------------------------------------------------

}