import dotenv from 'dotenv';
import { Dataset } from "crawlee";
import { categorizer } from "../src/categorization/categorizer.js";

dotenv.config({ silent: true });
const site = process.env.site;
const dataset = await Dataset.open(site);
const datasetCategorized = await Dataset.open(`${site}-categorized`);
const { items } = await dataset.getData();
const categorizedItems = items
    // .map(item => {
    //     let categorizedItem = item;
    //     categorizedItem = categorizer({
    //         product: categorizedItem,
    //         category: 'productType',
    //         includesOr: ['çantası', 'çanta'],
    //         keyword: 'çanta'
    //     });

    //     return categorizedItem
    // })
    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['çantası', 'omuz'],
            keyword: 'omuz çantası'
        });

        return categorizedItem
    })
    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['çapraz'],
            includesOr: ['çanta', 'çantası'],
            keyword: 'çapraz çanta'
        });

        return categorizedItem
    })
    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['sırt'],
            includesOr: ['çanta', 'çantası'],
            keyword: 'sırt çantası'
        });

        return categorizedItem
    })

    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['baget'],
            includesOr: ['çanta', 'çantası'],
            keyword: 'baget çanta'
        });

        return categorizedItem
    })
    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['plaj'],
            includesOr: ['çanta', 'çantası'],
            keyword: 'plaj çantası'
        });

        return categorizedItem
    })
    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['el'],
            includesAllExact: true,
            includesOr: ['çanta', 'çantası'],
            keyword: 'el çantası'
        });

        return categorizedItem
    })

    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['tablet'],
            includesAllExact: true,
            includesOr: ['çanta', 'çantası'],
            keyword: 'tablet çantası'
        });

        return categorizedItem
    })
    .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['telefon'],
            includesAllExact: true,
            includesOr: ['çanta', 'çantası'],
            keyword: 'telefon çantası'
        });

        return categorizedItem
    })
        .map(item => {
        let categorizedItem = item;
        categorizedItem = categorizer({
            product: categorizedItem,
            category: 'productType',
            includesAll: ['baskılı'],
            includesAllExact: true,
            includesOr: ['çanta', 'çantası'],
            keyword: 'baskılı çanta'
        });

        return categorizedItem
    })
debugger

await datasetCategorized.pushData(categorizedItems);

categorizer.getStats()