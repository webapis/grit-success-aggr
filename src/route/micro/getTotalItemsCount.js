/**
 * Gets the total count of items from a page element by extracting numbers from its text content
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element containing the count
 * @returns {Promise<number>} - The extracted count as a number, or 0 if not found/invalid
 */
export default async function getTotalItemsCount(page, selector) {
    debugger
    await page.waitForSelector(selector);
    const resultElement = await page.$eval(selector, el => el.textContent);
    const number = resultElement.trim().split(" ").filter(f => Number(f));

    console.log('getTotalItemsCount', number)
    debugger
    return number[0];
}

