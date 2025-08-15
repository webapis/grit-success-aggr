




import scrapeData from "./helper/scrapeData.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import { getDatasetData } from "../crawlee/datasetOperations.js";
export default async function second({
  page,

  addRequests,
  siteUrls
}) {

  await scrollPageIfRequired(page, siteUrls)
    const productItemSelector= await getDatasetData('matchedproductItemSelectors');
debugger
  const data = await scrapeData({ page, siteUrls,productItemSelector })

  return data

}