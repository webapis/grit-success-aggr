import dotenv from "dotenv";
import { createPuppeteerRouter, Dataset } from "crawlee";
import first from "../src/1_scraping/navigation/fistRoute.js";
import second from "../src/1_scraping/navigation/secondRoute.js";
import logToLocalSheet from "../src/2_data/persistence/sheet/logToLocalSheet.js";
import { uploadScreenshot } from "../src/2_data/persistence/uploadScreenshot.js";
import validateProductPage from "../src/1_scraping/navigation/helper/validateProductPage.js";
dotenv.config({ silent: true });

const site = process.env.site;
//const gitFolder = process.env.gitFolder;

export const createRouter = async (siteUrls) => {

  const productsDataset = await Dataset.open();
  const router = createPuppeteerRouter();
  let hasRunFirstPageFunction = false;
  router.addDefaultHandler(async (props) => {
    const { request: { url }, page } = props
    if (!hasRunFirstPageFunction) { // First request being processed
      console.log('First request being processed------------------', url);

      hasRunFirstPageFunction = true
        await validateProductPage({ page, siteUrls });


      const mainConfig = siteUrls.configurations[0];
      logToLocalSheet({
        paginationParameterName: mainConfig.paginationParameterName, scrollable: mainConfig.scrollable, showMoreButtonSelector: mainConfig.showMoreButtonSelector, debug: mainConfig.debug || false, inflexible_notes: mainConfig.inflexible_notes || '', paused: siteUrls.paused || false, pausedReason: siteUrls.pausedReason || ''

      });

    }

    const data = await first({ ...props, label: "default", siteUrls, uploadScreenshot });


    await productsDataset.pushData(data);


  });

  router.addHandler("second", async (props) => {

    const data = await second({ ...props, label: "second", siteUrls, uploadScreenshot });

    await productsDataset.pushData(data);
  });

  return router;
};