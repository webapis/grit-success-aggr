
// scripts/helpers/urlValidation.js

/**
 * Validates a list of URLs to ensure they have specific paths beyond the root.
 * @param {string[]} urls - An array of URLs to validate.
 * @returns {{validUrls: string[], invalidUrls: string[]}} - An object containing arrays of valid and invalid URLs.
 */
export function validateUrls(urls) {
    const invalidUrls = [];
    const validUrls = [];

    for (const url of urls) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;

            // A specific path exists if it's not just "/"
            const hasSpecificPath = path && path !== '/';

            if (hasSpecificPath) {
                validUrls.push(url);
            } else {
                invalidUrls.push(url);
            }
        } catch (error) {
            invalidUrls.push(url);
            console.error(`Error parsing URL "${url}": ${error.message}`);
        }
    }

    return { validUrls, invalidUrls };
}
