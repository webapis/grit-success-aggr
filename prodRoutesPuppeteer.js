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
debugger
  router.addDefaultHandler(async (props) => {
    debugger;
    const data = await first({ ...props, label: "default", siteUrls });
debugger;
    if (data) {
      await productsDataset.pushData(data);
    }
  });

  router.addHandler("second", async (props) => {
    const data = await second({ ...props, label: "second", siteUrls });

    if (data) {
      await productsDataset.pushData(data);
    }
  });

  return router;
};