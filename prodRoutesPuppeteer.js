import dotenv from "dotenv";
import { createPuppeteerRouter, Dataset } from "crawlee";
import first from "./src/route/fistRoute.js";
import second from "./src/route/secondRoute.js";
import getMainDomainPart from "./src/scrape-helpers/getMainDomainPart.js";
import urls from './src/meta/urls.json' assert { type: 'json' };

dotenv.config({ silent: true });

const site = process.env.site;
const gitFolder = process.env.gitFolder;

const productsDataset = await Dataset.open(site);

const selectors = urls.find(f => getMainDomainPart(f.urls[0]) === site)

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




