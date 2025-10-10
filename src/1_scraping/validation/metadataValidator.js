
import isValidURL from "./isValidURL.js";
import isValidText from "./isValidText.js";

/**
 * Validates metadata (link, title) for a single item.
 * @param {object} item - The item object.
 * @returns {object} An object containing metadata validation results.
 */
export function validateItemMetadata(item) {
    const linkValid = isValidURL(item.link);
    const titleValid = isValidText(item.title);
    const pageTitleValid = isValidText(item.pageTitle);

    return {
        linkValid,
        titleValid,
        pageTitleValid,
    };
}
