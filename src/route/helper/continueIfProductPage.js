import dotenv from "dotenv";
import scroller, { autoScroll } from "../../scrape-helpers/scroller.js";
import urls from '../../meta/urls.json' assert { type: 'json' };
dotenv.config({ silent: true });

const site = process.env.site;
const siteUrls = urls.find(f => getMainDomainPart(f.urls[0]) === site)
export default async function continueIfProductPage({page}) {
    const isAutoScroll = siteUrls?.isAutoScroll || false;
    const productItemsCount = await page.$$eval(productPageSelector.join(', '), elements => elements.length);
    if (productItemsCount === 0) {
        console.log('No product items found on the page');
        return [];
    }
    if (isAutoScroll) {
        console.log('autoscrolling')
        await autoScroll(page, 150)
    } else {
        //  await scroller(page, 150, 5);
    }
}