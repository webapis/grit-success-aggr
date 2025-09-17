import dotenv from 'dotenv';
import { Dataset } from "crawlee";
import productCategoryRules from '../src/categorization/rules/category.js';
import colorsRule from '../src/categorization/rules/colors.js'
import genderRule from '../src/categorization/rules/gender.js';
import { categorizer, categorizeProducts } from "../src/categorization/categorizer.js";
import { countCategorizedItems } from '../src/categorization/countCategorizedItems.js';
import { analyzeProductTitles,getSuggestionsByStatus } from '../src/categorization/analyzeProductTitles.js';
import fs from 'fs';
import path from 'path';
//https://claude.ai/chat/7e8ed2e1-ee49-4015-8844-89da5f8b61be
dotenv.config({ silent: true });
const site = process.env.site;
const dataset = await Dataset.open(site);
const datasetCategorized = await Dataset.open(`${site}-categorized`);
const { items } = await dataset.getData();
const categorizedItems = categorizeProducts(items, [...productCategoryRules,...colorsRule,...genderRule], true);

await datasetCategorized.pushData(categorizedItems);

const outputDir = path.join('categorization_results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const result = countCategorizedItems(categorizedItems);
const resultAsJson = JSON.stringify(result, null, 2);
const resultOutputPath = path.join(outputDir, `categorization-summary-${site}.json`);
fs.writeFileSync(resultOutputPath, resultAsJson);
console.log(`Categorization summary saved to ${resultOutputPath}`);
// console.log("Category counts:", result.categoryCounts);
// console.log("Totals:", result.totals);
debugger;
const analysis = analyzeProductTitles(categorizedItems);
//console.log("Title Analysis:", analysis);
debugger;
const newWords = getSuggestionsByStatus(analysis, false);
const filteredNewWords = newWords.filter(item => !/\d/.test(item.word));
const outputPath = path.join(outputDir, `new-words-${site}.json`);
fs.writeFileSync(outputPath, JSON.stringify(filteredNewWords, null, 2));
console.log(`New word suggestions saved to ${outputPath}`);