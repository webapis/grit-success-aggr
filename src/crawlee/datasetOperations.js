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


/**
 * Push data to a specific dataset
 * @param {string} datasetName - Name of the dataset to push data to
 * @param {Object} data - Data object to push to the dataset
 * @returns {Promise<void>}
 */
export async function pushDataToDataset(datasetName, data) {
    const dataset = await Dataset.open(datasetName);
    await dataset.pushData(data);
}

// Usage example:
// await pushDataToDataset('totalItemsToBeCallected', { totalItemsToBeCallected });