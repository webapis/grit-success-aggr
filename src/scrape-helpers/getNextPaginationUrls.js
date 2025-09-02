

import logToLocalSheet from '../sheet/logToLocalSheet.js';
import getTotalItemsCount from '../route/micro/getTotalItemsCount.js';
import findBestSelector from '../route/micro/findBestSelector.js';
export default async function getNextPaginationUrls(page, url, siteUrls) {


  const {
    productItemSelector } = logToLocalSheet()

  const { count: totalItemsToCallect } =
    await getTotalItemsCount(page, siteUrls?.totalProductCounterSelector);

  const itemsPerPage = await page.$$eval(productItemSelector, els => els.length);
  
  const paginationSelector = siteUrls?.paginationSelector
  const paginationParameterName = siteUrls?.paginationParameterName
  if (itemsPerPage && paginationParameterName && totalItemsToCallect > 0) {
    console.log('pagination with itemsPerPage, paginationParameterName, totalItemsToCallect', itemsPerPage, paginationParameterName, totalItemsToCallect)
    
    const nextUrls = await page.evaluate((baseUrl, itemsPerPage, paginationParameterName, totalItemsToCallect) => {


      const totalPages = Math.ceil(totalItemsToCallect / itemsPerPage) - 1;
      if (totalPages === 1) {

        return [`${baseUrl}${paginationParameterName}${2}`];
      }
      const urls = [];
      for (let i = 2; i <= (totalPages + 1); i++) {
        urls.push(`${baseUrl}${paginationParameterName}${i}`);
      }
      return urls;

    }, url, itemsPerPage, paginationParameterName, totalItemsToCallect);


    return nextUrls;
  } else
    if (paginationSelector && paginationParameterName) {
      console.log('pagination with  paginationSelector,paginationParameterName', paginationSelector, paginationParameterName)
      const result = await page.evaluate((paginationSelector, baseUrl, paginationParameterName) => {

        try {

          // Type 1: Page number buttons (like 1, 2, 3, ...)
          const pageNumbers = [...document.querySelectorAll(paginationSelector)]
            .map(el => el.innerText.trim())
            .filter(text => /^\d+$/.test(text))
            .map(num => parseInt(num, 10));

          const maxPage = Math.max(...pageNumbers, 1);
          const urls = [];
          for (let i = 2; i <= maxPage; i++) {
            urls.push(`${baseUrl}${paginationParameterName}${i}`);
          }
          return urls;

        } catch (error) {
          console.error('Pagination eval error:', error);
          return [];
        }
      }, paginationSelector, url, paginationParameterName);

      return result;

    } else {
      return []
    }
}
