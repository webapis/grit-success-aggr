import isValidImageURL from "./isValidImageURL.js";
import isValidVideoURL from "./isValidVideoURL.js";
import isValidURL from "./isValidURL.js";
import isValidText from "./isValidText.js";
import getMiddleImageUrl from "./getMiddleImageUrl.js";
import priceParser from "./priceParcer.js";

/**
 * Process and validate scraped data items
 * @param {Array} data - Array of scraped data items
 * @param {Object} siteUrls - Site URLs configuration containing imageCDN and urls
 * @returns {Promise<Array>} A promise that resolves to an array of processed and validated data items
 */
export default async function processAndValidateScrapedData(data, siteUrls) {
    return Promise.all(data.map(async item => {
        // Process images
        debugger
        const processedImgs = (item.img || [])
            .map(m => m /*getMiddleImageUrl(m, siteUrls.imageCDN || siteUrls.urls[0])*/)
            .filter(Boolean);

        // Validate images
        const imgValid = processedImgs.some(isValidImageURL);
        if (!imgValid) {
            console.log(`Invalid image URLs for item:`, item);
        }

        // Validate videos
        const videoValid = item.videos && item.videos.length > 0 && item.videos.every(isValidVideoURL);

        // Parse and validate prices
        const { parsedPrices, priceValid } = await priceParser(item,siteUrls);

        // Return processed item with all validations
        return {
            ...item,
            price: parsedPrices,
            img: processedImgs,
            imgValid,
            linkValid: isValidURL(item.link),
            titleValid: isValidText(item.title),
            pageTitleValid: isValidText(item.pageTitle),
            priceValid: item.productNotInStock ? true : priceValid,
            videoValid,
            mediaType: item.videos && item.videos.length > 0 ? 'video' : 'image'
        };
    }));
}