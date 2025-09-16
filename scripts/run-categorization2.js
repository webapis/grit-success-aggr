import dotenv from 'dotenv';
import { Dataset } from "crawlee";
import productCategoryRules from '../src/categorization/rules/category.js';
import colorsRule from '../src/categorization/rules/colors.js';
import { categorizer, categorizeProducts,CategorizationStats } from "../src/categorization/categorizer.js";
//https://claude.ai/chat/7e8ed2e1-ee49-4015-8844-89da5f8b61be
dotenv.config({ silent: true });
const site = process.env.site;
const dataset = await Dataset.open(site);
const datasetCategorized = await Dataset.open(`${site}-categorized`);
const { items } = await dataset.getData();
const categorizedItems = categorizeProducts(items, [...productCategoryRules,...colorsRule], true);

await datasetCategorized.pushData(categorizedItems);

CategorizationStats.getStats();