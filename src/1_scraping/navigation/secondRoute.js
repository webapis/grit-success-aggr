




import scrapeData from "../extraction/scrapeData.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import logToLocalSheet from "../../2_data/persistence/sheet/logToLocalSheet.js";
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
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  await delay(5000); // wait for 5 seconds
  await scrollPageIfRequired({ page, siteUrls, routeName: "second" })
  const data = await scrapeData({ page, siteUrls, productItemSelector })
  const { pageItems, pageNumbers } = logToLocalSheet()

  const mergePageItems = [...pageItems, data.length]
  const pageNumber = extractPageNumber(url, paginationParameterName);
  logToLocalSheet({ pageItems: mergePageItems, pageNumbers: [...pageNumbers, pageNumber] })

  return data

}