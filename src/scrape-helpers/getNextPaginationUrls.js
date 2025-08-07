/**
 * Generates next pagination URLs from the current page
 * based on provided selectors and rules.
 * 
 * @param {import('puppeteer').Page} page - Puppeteer page object
 * @param {string} url - Current page URL
 * @param {Array<string>} funcPageSelector - Pagination strategy selectors
 * @param {Array<string>} paginationPostfix - URL postfix(es) like ['?page=']
 * @returns {Promise<string[]>} Array of next page URLs
 */
export default async function getNextPaginationUrls(page, url, funcPageSelector, paginationPostfix) {
  debugger
  if (!funcPageSelector || funcPageSelector.length === 0 || !paginationPostfix || paginationPostfix.length === 0) {
    return [];
  }

  const postfix = paginationPostfix; // Support only first for now
debugger
  return await page.evaluate((selectors, baseUrl, postfix) => {
    debugger
    try {
      if (selectors.length === 1) {
        // Type 1: Page number buttons (like 1, 2, 3, ...)
        const paginationSelector = selectors[0];
        const pageNumbers = [...document.querySelectorAll(paginationSelector)]
          .map(el => el.innerText.trim())
          .filter(text => /^\d+$/.test(text))
          .map(num => parseInt(num, 10));

        const maxPage = Math.max(...pageNumbers, 1);
        const urls = [];
        for (let i = 1; i <= maxPage; i++) {
          urls.push(`${baseUrl}${postfix}${i}`);
        }
        return urls;
      } else if (selectors.length === 2) {
        debugger
        // Type 2: total count / items per page
        const totalCountSelector = selectors[0];
        const itemsPerPage = parseInt(selectors[1], 10);

        const totalCountText = document.querySelector(totalCountSelector)?.innerText || '';
        const totalCount = parseInt(totalCountText.replace(/\D/g, ''), 10);

        if (!isNaN(totalCount) && totalCount > itemsPerPage) {
          const totalPages = Math.ceil(totalCount / itemsPerPage);
          const urls = [];
          for (let i = 1; i <= totalPages; i++) {
            urls.push(`${baseUrl}${postfix}${i}`);
          }
          return urls;
        } else {
          return [];
        }
      } else {
        return [];
      }
    } catch (error) {
      console.error('Pagination eval error:', error);
      return [];
    }
  }, funcPageSelector, url, postfix);
}
