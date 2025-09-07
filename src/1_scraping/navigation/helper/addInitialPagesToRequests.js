
import dotenv from "dotenv";

import commonExcludedPatterns from "../../selector-attibutes/commonExcludedPatterns.js";



dotenv.config({ silent: true });



debugger
const womanBags = ["kadin-canta",
    "kadin-cuzdan", "valiz-modelleri", "seyahat", "canta-155", "canta-aksesuar", "canta", "bags", "aksesuar"

]
export default async function addInitialPagesToRequests({ page, addRequests,siteUrls }) {
    if (siteUrls?.navigationUrls) {
        try {


            let result = await page.evaluate((navigationUrls) => {
                const dynamicFunction = eval(navigationUrls);

                return dynamicFunction;

            }, siteUrls.navigationUrls);

            if (!Array.isArray(result)) {

                result = await eval(siteUrls.navigationUrls)(page);
            }

            console.log('navigationUrls', result);
            const mappedUrls = result.filter(url => typeof url === 'string' && /^https?:\/\//.test(url) && womanBags.some(keyword => url.includes(keyword))).map(url => ({ url, label: 'second' }));

            await addRequests(mappedUrls);

        } catch (error) {
            console.log('Error in navigationUrls:', error);
        }

    } else {

        try {
            const result = await page.evaluate(() => {
                const seen = new Set();
                const filtered = [];

                Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .forEach(href => {
                        try {
                            if (
                                typeof href === 'string' &&
                                /^https?:\/\//.test(href)
                            ) {
                                const url = new URL(href);
                                const isRoot = url.pathname === '/' || url.pathname === '';

                                const normalized = href.toLowerCase();
                                if (!isRoot && !seen.has(normalized)) {
                                    seen.add(normalized);
                                    filtered.push(href);
                                }
                            }
                        } catch (e) {
                            // skip invalid URLs
                        }
                    });

                return filtered;
            });



            // Filter out common excluded patterns
            const combinedExcludedPatterns = [
                ...commonExcludedPatterns,
                ...(siteUrls?.excludeUrlPatterns || []),
            ];
            const filteredResult = result.filter((url) => womanBags.some(keyword => url.includes(keyword))).filter(url =>
                !combinedExcludedPatterns.some(pattern => url.toLowerCase().includes(pattern))
            );
            console.log('filteredResult', filteredResult);
            debugger;
            await addRequests(filteredResult.map(url => ({ url, label: 'second' })));

            return filteredResult
            debugger;
        } catch (error) {

            console.log(error)
            return []

        }

    }

}