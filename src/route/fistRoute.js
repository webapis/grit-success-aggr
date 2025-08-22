


import dotenv from "dotenv";
import scrapeData from "./scrape/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";
import continueIfProductPage from "./helper/continueIfProductPage.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";



dotenv.config({ silent: true });

const site = process.env.site;

export default async function first(props) {
    const { page, addRequests, siteUrls, request: { url } } = props
    debugger
    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
    });

    console.log('inside first route')

    debugger
    const { success, productItemSelector } = await continueIfProductPage({ page, siteUrls });
    debugger
    if (success) {

        debugger
        await scrollPageIfRequired({page, siteUrls,routeName:"first"})
        await addNextPagesToRequests({ page, addRequests, siteUrls, url });
        const data = await scrapeData({ page, siteUrls, productItemSelector })
        return data
    } else {

        return []
    }

}