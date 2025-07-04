import dotenv from "dotenv";
import { createPuppeteerRouter, Dataset } from "crawlee";
import first, { second } from "./sites/products/collector.js";
import urls from './sites/products/urls.json' assert { type: 'json' };

dotenv.config({ silent: true });

const site = process.env.site;
const gitFolder = process.env.gitFolder;

const productsDataset = await Dataset.open(site);

const selectors = urls.find(f => f.site === site)

export const router = createPuppeteerRouter();

router.addDefaultHandler(async (props) => {
  

  const data = await first({ ...props, label: "default", ...selectors })
  
  if (data) {
    await productsDataset.pushData(data);
  }
});

router.addHandler("second", async (props) => {

  const data = await second({ ...props, label: "second", ...selectors })
  

  if (data) {
    await productsDataset.pushData(data);
  }

});




