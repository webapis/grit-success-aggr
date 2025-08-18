




import scrapeData from "./helper/scrapeData.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import { getDatasetData } from "../crawlee/datasetOperations.js";
export default async function second({
  page,

  addRequests,
  siteUrls
}) {
  debugger
  console.log('inside second route')
  const productItemSelector = await getDatasetData('matchedproductItemSelectors');
  debugger

  await scrollPageIfRequired({ page, siteUrls, routeName: "second" })
  const data = await scrapeData({ page, siteUrls, productItemSelector })

  return data

}