import { Dataset } from 'crawlee';

/**
 * Get data from a specific dataset
 */

export async function getDatasetData(datasetName) {
    const dataset = await Dataset.open(datasetName);
    const { items } = await dataset.getData();
    return items?.[0]?.[datasetName];
}

export async function getDatasetItems(datasetName) {
    const dataset = await Dataset.open(datasetName);
    const { items } = await dataset.getData();
    return items || [];
}