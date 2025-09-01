




import scrapeData from "./scrape/scrapeData.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import logToLocalSheet from "../sheet/logToLocalSheet.js";
import extractPageNumber from "./helper/extractPageNumber.js";
export default async function second({
  page,

  addRequests,
  siteUrls,
  request: { url }
}) {
  debugger
  console.log('inside second route')
  const paginationParameterName = siteUrls?.paginationParameterName
  const { productItemSelector } = logToLocalSheet()
  debugger

  await scrollPageIfRequired({ page, siteUrls, routeName: "second" })
  const data = await scrapeData({ page, siteUrls, productItemSelector })
  const { pageItems, pageNumbers } = logToLocalSheet()

  const mergePageItems = [...pageItems, data.length]
  const pageNumber = extractPageNumber(url, paginationParameterName);
  logToLocalSheet({ pageItems: mergePageItems, pageNumbers: [...pageNumbers, pageNumber] })

  return data

}