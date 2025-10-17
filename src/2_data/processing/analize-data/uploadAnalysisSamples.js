import dotenv from 'dotenv';
import {
    uploadCollection,
    uploadJSONToGoogleDrive
} from "../../persistence/index.js";
import extractCSSSelectors from '../../../1_scraping/helpers/extractCSSSelectors.js';

dotenv.config({ silent: true });

const SAMPLE_SIZE = 5;

/**
 * Handles the conditional upload of various analysis data samples.
 * @param {Object} metrics - The metrics object from calculateMetrics.
 * @param {string} site - The name of the site being analyzed.
 * @param {boolean} isDebug - A flag to enable more verbose uploads.
 * @returns {Object} An object containing the URLs of the uploaded samples.
 */
export async function uploadAnalysisSamples({ metrics, site, isDebug }) {
    const { invalidItems, dataWithoutError, duplicateURLs } = metrics;
    const links = {};

    const serviceAccountCredentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
    );

    // --- Upload Invalid Item Samples ---
    if (invalidItems.length > 0 && isDebug) {
        console.log(`Found ${invalidItems.length} invalid items, uploading samples...`);
        const sample = invalidItems.slice(0, SAMPLE_SIZE);
        const jsonBuffer = Buffer.from(JSON.stringify(sample, null, 2), 'utf-8');

        links.errorSampleDrive = await uploadJSONToGoogleDrive({
            buffer: jsonBuffer,
            fileName: `${site}-error.json`,
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
            serviceAccountCredentials,
        });
        console.log('Uploaded invalid items sample to Google Drive:', links.errorSampleDrive?.webViewLink || 'N/A');

        links.errorSampleGit = await uploadCollection({
            fileName: site,
            data: sample,
            gitFolder: "ErrorSample",
            compress: false
        });
        console.log('Uploaded invalid items sample to Git:', links.errorSampleGit?.url || 'N/A');
    }

    // --- Upload Valid Item Samples ---
    if (dataWithoutError.length > 0) {
        const sample = dataWithoutError.slice(0, SAMPLE_SIZE);
        const jsonBuffer = Buffer.from(JSON.stringify(sample, null, 2), 'utf-8');

        links.validSampleDrive = await uploadJSONToGoogleDrive({
            buffer: jsonBuffer,
            fileName: `${site}.json`,
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
            serviceAccountCredentials,
        });
        console.log('Uploaded valid items sample to Google Drive:', links.validSampleDrive?.webViewLink || 'N/A');

        links.validSampleGit = await uploadCollection({
            fileName: site,
            data: dataWithoutError, // Upload all valid data
            gitFolder: "validSample",
            compress: false
        });
        console.log('Uploaded all valid items to Git:', links.validSampleGit?.url || 'N/A');
    }

    // --- Upload Duplicate URL Samples ---
    if (duplicateURLs.length > 1 && isDebug) {
        const sample = duplicateURLs.slice(0, SAMPLE_SIZE);
        links.duplicateUrlSampleGit = await uploadCollection({
            fileName: site,
            data: sample,
            gitFolder: "duplicateUrl",
            compress: false
        });
        console.log('Uploaded duplicate URL samples to Git:', links.duplicateUrlSampleGit?.url || 'N/A');
    }

    // --- Upload CSS Selector Analysis ---
    if (dataWithoutError.length > 0 && isDebug) {
        const cssSelectors = extractCSSSelectors(dataWithoutError);
        links.cssSelectorsGit = await uploadCollection({
            fileName: site,
            data: cssSelectors,
            gitFolder: "cssselectors",
            compress: false
        });
        console.log('Uploaded CSS selectors to Git:', links.cssSelectorsGit?.url || 'N/A');
    }

    return {
        'Valid Sample Data (Drive)': links.validSampleDrive?.webViewLink || 'N/A',
        'Valid Sample Data (Git)': links.validSampleGit?.url || 'N/A',
        'Error Sample Data (Drive)': links.errorSampleDrive?.webViewLink || 'N/A',
        'Error Sample Data (Git)': links.errorSampleGit?.url || 'N/A',
        'Duplicate URL Sample Data (Git)': links.duplicateUrlSampleGit?.url || 'N/A',
        'CSS Selectors Data (Git)': links.cssSelectorsGit?.url || 'N/A'
    };
}