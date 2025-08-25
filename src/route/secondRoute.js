




import scrapeData from "./scrape/scrapeData.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import logToLocalSheet from "../sheet/logToLocalSheet.js";
export default async function second({
  page,

  addRequests,
  siteUrls
}) {
  debugger
  console.log('inside second route')

  const {productItemSelector}=logToLocalSheet()
  debugger

  await scrollPageIfRequired({ page, siteUrls, routeName: "second" })
  const data = await scrapeData({ page, siteUrls, productItemSelector })

  return data

}