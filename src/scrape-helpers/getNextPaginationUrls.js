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
export default async function getNextPaginationUrls(page, url, siteUrls) {
  debugger

  const paginationSelector = siteUrls?.paginationSelector
  const paginationParameterName = siteUrls?.paginationParameterName
  const itemsPerPage = siteUrls?.itemsPerPage
  const totalProductCounterSelector = siteUrls?.totalProductCounterSelector 
  debugger
  if (paginationSelector && paginationParameterName) {
    return await page.evaluate((paginationSelector, baseUrl, paginationParameterName) => {
      debugger
      try {

        // Type 1: Page number buttons (like 1, 2, 3, ...)
        const pageNumbers = [...document.querySelectorAll(paginationSelector)]
          .map(el => el.innerText.trim())
          .filter(text => /^\d+$/.test(text))
          .map(num => parseInt(num, 10));

        const maxPage = Math.max(...pageNumbers, 1);
        const urls = [];
        for (let i = 1; i <= maxPage; i++) {
          urls.push(`${baseUrl}${ paginationParameterName}${i}`);
        }
        return urls;

      } catch (error) {
        console.error('Pagination eval error:', error);
        return [];
      }
    }, paginationSelector, url, paginationParameterName);

  } else if (itemsPerPage && paginationParameterName && totalProductCounterSelector) {

    const nextUrls = await page.evaluate((baseUrl, itemsPerPage, paginationParameterName, totalProductCounterSelector) => {
        const totalCountText = document.querySelector(totalProductCounterSelector)?.innerText || '';
        const totalCount = parseInt(totalCountText.replace(/\D/g, ''), 10);
      if (!isNaN(totalCount) && totalCount > itemsPerPage) {
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        const urls = [];
        for (let i = 1; i <= totalPages; i++) {
          urls.push(`${baseUrl}${paginationParameterName}${i}`);
        }
        return urls;
      } else {
        return [];
      }
    }, url, itemsPerPage, paginationParameterName,  totalProductCounterSelector);

    debugger
    return nextUrls;
  }

  debugger
}
