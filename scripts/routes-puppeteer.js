import dotenv from "dotenv";
import { createPuppeteerRouter, Dataset } from "crawlee";
import first from "../src/1_scraping/navigation/fistRoute.js";
import second from "../src/1_scraping/navigation/secondRoute.js";
import logToLocalSheet from "../src/2_data/persistence/sheet/logToLocalSheet.js";
dotenv.config({ silent: true });

const site = process.env.site;
//const gitFolder = process.env.gitFolder;

export const createRouter = async (siteUrls) => {

  const productsDataset = await Dataset.open(site);
  const router = createPuppeteerRouter();
  let hasRunFirstPageFunction = false;
  router.addDefaultHandler(async (props) => {
    const {  request: { url } } = props
    if (!hasRunFirstPageFunction) { // First request being processed
      console.log('First request being processed------------------', url);
      
      hasRunFirstPageFunction = true

      logToLocalSheet({ paginationParameterName: siteUrls.paginationParameterName, scrollable: siteUrls.scrollable, showMoreButtonSelector: siteUrls.showMoreButtonSelector, debug: siteUrls.debug || false,inflexible_notes: siteUrls.inflexible_notes || '',paused:siteUrls.paused || false,pausedReason:siteUrls.pausedReason || ''
      
      });

    }
    debugger
    const data = await first({ ...props, label: "default", siteUrls });

    debugger
   await productsDataset.pushData(data);
    debugger

  });

  router.addHandler("second", async (props) => {
    debugger
    const data = await second({ ...props, label: "second", siteUrls });
    debugger
    await productsDataset.pushData(data);
  });

  return router;
};