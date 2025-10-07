
import isValidImageURL from "./isValidImageURL.js";
import isValidVideoURL from "./isValidVideoURL.js";
import getMiddleImageUrl from "./getMiddleImageUrl.js";

/**
 * Processes and validates all media (images, videos) for a single item.
 * @param {object} item - The item object with `img` and `videos` arrays.
 * @param {object} siteConfig - The site configuration.
 * @returns {object} An object containing comprehensive media validation results.
 */
export function validateItemMedia(item, siteConfig) {
    // Image validation
    const processedImgs = (item.img || [])
        .map(imgUrl => getMiddleImageUrl(imgUrl, siteConfig.imageCDN || siteConfig.urls[0]))
        .filter(Boolean);
    const imgValid = processedImgs.some(isValidImageURL);

    // Video validation
    const videoValid = item.videos && item.videos.length > 0 && item.videos.every(isValidVideoURL);

    // Media type assignment
    const mediaType = videoValid ? 'video' : 'image';

    return {
        processedImages: processedImgs,
        imgValid,
        videoValid,
        mediaType,
    };
}
