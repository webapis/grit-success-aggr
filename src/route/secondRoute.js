




import scrapeData from "./helper/scrapeData.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";

export default async function second({
  page,

  addRequests,
  siteUrls
}) {

  await scrollPageIfRequired(page, siteUrls)
  const data = await scrapeData({ page, siteUrls })

  return data

}