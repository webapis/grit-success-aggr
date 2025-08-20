
import { getDatasetData } from '../crawlee/datasetOperations.js';
export default async function getNextPaginationUrls(page, url, siteUrls) {
  debugger

  const itemsPerPage = await getDatasetData('totalItemsPerPage');

  debugger
  const paginationSelector = siteUrls?.paginationSelector
  const paginationParameterName = siteUrls?.paginationParameterName
  //const itemsPerPage = siteUrls?.itemsPerPage
  const totalItemsToCallect = await getDatasetData('totalItemsToBeCallected');
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
          urls.push(`${baseUrl}${paginationParameterName}${i}`);
        }
        return urls;

      } catch (error) {
        console.error('Pagination eval error:', error);
        return [];
      }
    }, paginationSelector, url, paginationParameterName);

  } else if (itemsPerPage && paginationParameterName && totalItemsToCallect > 0) {

    const nextUrls = await page.evaluate((baseUrl, itemsPerPage, paginationParameterName, totalItemsToCallect) => {

      const totalCount = parseInt(totalCountText.replace(/\D/g, ''), 10);
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
