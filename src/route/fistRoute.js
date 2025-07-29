


import dotenv from "dotenv";
import urls from '../meta/urls.json' assert { type: 'json' };
import commonExcludedPatterns from "../selector-attibutes/commonExcludedPatterns.js";
import { uploadToGoogleDrive } from '../sheet/uploadToGoogleDrive.js';
import getMainDomainPart from "../scrape-helpers/getMainDomainPart.js";

dotenv.config({ silent: true });

const site = process.env.site;
const siteUrls = urls.find(f => getMainDomainPart(f.urls[0]) === site)
const womanBags =["kadin-canta" ,"kadin-cuzdan","valiz-modelleri"

]
export default async function first({ page, addRequests }) {

    await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
    });

    // take screenshot and upload to google drive
    // const screenshotBuffer = await page.screenshot({ fullPage: true });

    // const uploadResult = await uploadToGoogleDrive({
    //     buffer: screenshotBuffer,
    //     fileName: `screenshot-${site}-${Date.now()}.png`,
    //     folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    //     serviceAccountCredentials: JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')),
    // });

    // console.log('📸 Screenshot uploaded:', uploadResult.webViewLink);



    console.log('inside first route')

    if (siteUrls.navigationUrls) {
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
            const filteredResult = result.filter((url)=>womanBags.some(keyword => url.includes(keyword))).filter(url =>
                !combinedExcludedPatterns.some(pattern => url.toLowerCase().includes(pattern))
            );
            console.log('filteredResult', filteredResult);
            debugger;
            await addRequests(filteredResult.map(url => ({ url, label: 'second' })));
            debugger;
        } catch (error) {
            debugger;
        }

    }



}