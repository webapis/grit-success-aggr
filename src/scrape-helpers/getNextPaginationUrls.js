

import logToLocalSheet from '../sheet/logToLocalSheet.js';
export default async function getNextPaginationUrls(page, url, siteUrls) {
  debugger

  const {
    totalItemsPerPage: itemsPerPage, totalItemsToBeCallected: totalItemsToCallect } = logToLocalSheet()

  debugger
  const paginationSelector = siteUrls?.paginationSelector
  const paginationParameterName = siteUrls?.paginationParameterName

  if (paginationSelector && paginationParameterName) {

    const result = await page.evaluate((paginationSelector, baseUrl, paginationParameterName) => {
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
          urls.push(`${baseUrl}${paginationParameterName}${i}`);
        }
        return urls;

      } catch (error) {
        console.error('Pagination eval error:', error);
        return [];
      }
    }, paginationSelector, url, paginationParameterName);
    debugger
    return result;

  } else if (itemsPerPage && paginationParameterName && totalItemsToCallect > 0) {

    const nextUrls = await page.evaluate((baseUrl, itemsPerPage, paginationParameterName, totalItemsToCallect) => {

      if (!isNaN(totalItemsToCallect) && totalItemsToCallect > itemsPerPage) {
        const totalPages = Math.ceil(totalItemsToCallect / itemsPerPage);
        const urls = [];
        for (let i = 1; i <= totalPages; i++) {
          urls.push(`${baseUrl}${paginationParameterName}${i}`);
        }
        return urls;
      } else {
        return [];
      }
    }, url, itemsPerPage, paginationParameterName, totalItemsToCallect);

    debugger
    return nextUrls;
  } else {
    return []
  }
}
