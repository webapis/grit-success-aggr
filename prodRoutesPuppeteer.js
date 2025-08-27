import dotenv from "dotenv";
import { createPuppeteerRouter, Dataset } from "crawlee";
import first from "./src/route/fistRoute.js";
import second from "./src/route/secondRoute.js";

dotenv.config({ silent: true });

const site = process.env.site;
const gitFolder = process.env.gitFolder;

export const createRouter = async (siteUrls) => {

  const productsDataset = await Dataset.open(site);
  const router = createPuppeteerRouter();

  router.addDefaultHandler(async (props) => {
    const { crawler } = props;
    const stats = await crawler.stats;

    if (stats.requestsFinished === 0) { // First request being processed
      console.log('First request being processed------------------');
    }
    const data = await first({ ...props, label: "default", siteUrls });
    await productsDataset.pushData(data);
  });

  router.addHandler("second", async (props) => {
    const data = await second({ ...props, label: "second", siteUrls });
    await productsDataset.pushData(data);
  });

  return router;
};