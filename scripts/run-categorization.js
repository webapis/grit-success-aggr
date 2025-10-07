import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import productCategoryRules from '../src/categorization/rules/category.js';
import colorsRule from '../src/categorization/rules/colors.js';
import genderRule from '../src/categorization/rules/gender.js';
import { categorizeProducts } from '../src/categorization/categorizer.js';
import { countCategorizedItems } from '../src/categorization/countCategorizedItems.js';
import { analyzeProductTitles, getSuggestionsByStatus } from '../src/categorization/analyzeProductTitles.js';

dotenv.config({ silent: true });

const site = process.env.site;
const RAW_DATA_DIR = path.join(process.cwd(), 'storage', 'datasets', 'default');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const CATEGORIZATION_RESULTS_DIR = path.join(process.cwd(), 'categorization_results');
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'categorized-products.json');
const SUMMARY_OUTPUT_FILE = path.join(CATEGORIZATION_RESULTS_DIR, `categorization-summary-${site}.json`);
const NEW_WORDS_OUTPUT_FILE = path.join(CATEGORIZATION_RESULTS_DIR, `new-words-${site}.json`);

async function main() {
    console.log('\n📊 Starting independent categorization process...\n');
    console.log(`Reading raw data from: ${RAW_DATA_DIR}\n`);

    if (!fs.existsSync(RAW_DATA_DIR)) {
        console.error(`Error: Raw data directory not found at ${RAW_DATA_DIR}`);
        console.error('Please run the scraping process first to generate data.');
        process.exit(1);
    }

    if (!fs.existsSync(ARTIFACTS_DIR)) {
        fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    }

    if (!fs.existsSync(CATEGORIZATION_RESULTS_DIR)) {
        fs.mkdirSync(CATEGORIZATION_RESULTS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(RAW_DATA_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.log('No JSON files found in the raw data directory. Nothing to process.');
        return;
    }

    const allItems = [];
    for (const file of files) {
        const filePath = path.join(RAW_DATA_DIR, file);
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const items = JSON.parse(rawData);
        allItems.push(...(Array.isArray(items) ? items : [items]));
    }

    console.log(`🔍 Categorizing ${allItems.length} items from ${files.length} file(s)...`);
    const allRules = [...productCategoryRules, ...colorsRule, ...genderRule];
    const categorizedItems = categorizeProducts(allItems, allRules, true);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(categorizedItems, null, 2));

    console.log('\n--- Categorization Summary ---\n');
    console.log(`Total Items Processed: ${categorizedItems.length}`);
    console.log(`✅ Successfully created categorized data at: ${OUTPUT_FILE}`);
    console.log('-----------------------------------\n');

    // Generate and save categorization summary
    const categorySummary = countCategorizedItems(categorizedItems);
    fs.writeFileSync(SUMMARY_OUTPUT_FILE, JSON.stringify(categorySummary, null, 2));
    console.log(`✅ Successfully created categorization summary at: ${SUMMARY_OUTPUT_FILE}`);

    // Generate and save new words analysis
    const titleAnalysis = analyzeProductTitles(categorizedItems);
    const newWords = getSuggestionsByStatus(titleAnalysis, false);
    fs.writeFileSync(NEW_WORDS_OUTPUT_FILE, JSON.stringify(newWords, null, 2));
    console.log(`✅ Successfully created new words analysis at: ${NEW_WORDS_OUTPUT_FILE}`);
}

main().catch(error => {
    console.error('💥 An error occurred during the categorization process:', error);
    process.exit(1);
});