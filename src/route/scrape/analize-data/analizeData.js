import dotenv from 'dotenv';

import countUnique from "./countUnique.js";
import countByField from "./countByField.js";
import getAggrTimeSpan from "./getAggrTimeSpan.js";
import findDuplicatesByLink from './findDuplicatesByLink.js';
import getUniquePageURLs from "./getUniquePageURLs.js";
import { uploadCollection } from "../../../uploadCollection.js";
import uploadJSONToGoogleDrive from "../../../drive/uploadJSONToGoogleDrive.js";
dotenv.config({ silent: true });

const site = process.env.site;

export default async function analyzeData(data) {
    const dataWithoutError = data.filter(f => !f.error);
    const dataWithError = data.filter(f => f.error);
    const { oldestTimestamp, newestTimestamp, minutesSpan } = getAggrTimeSpan({ data });
    const totalPages = countUnique({ data, key: 'pageURL' });
    const totalUniqueItems = countUnique({ data, key: 'link' });
    const invalidLinks = countByField(data, 'linkValid');
    const invalidimgs = countByField(data.filter(f => f.mediaType === 'image'), 'imgValid');
    const invalidVideos = countByField(data.filter(f => f.mediaType === 'video'), 'videoValid');
    const invalidTitles = countByField(data, 'titleValid');
    const invalidPageTitles = countByField(data, 'pageTitleValid');
    const invalidPrices = countByField(data, 'priceValid');
    const unsetPrices = countByField(data, 'priceisUnset', true);
    const priceScrapeErrors = countByField(data, 'priceScrapeError', true);
    const totalNotAvailables = countByField(data, 'productNotInStock', true);
    const duplicateURLs = findDuplicatesByLink(data);
    const uniquePageURLs = getUniquePageURLs({ data: dataWithoutError });

    const invalidItems = data.filter(item =>
        !item.imgValid ||
        !item.linkValid ||
        !item.titleValid ||
        !item.pageTitleValid ||
        !item.priceValid
    );

    // Upload error samples if any
    let JSONSampleDataWithErrorDriveLink = null;
    let JSONSampleDataWithErrorGitLink = null;
    let JSONSampleDataWithDuplicateUrlDataGitLink = null;

    if (invalidItems.length > 0) {
        console.log(`Found ${invalidItems.length} invalid items, uploading samples...`);

        const jsonBuffer = Buffer.from(JSON.stringify(invalidItems.filter((f, i) => i < 5), null, 2), 'utf-8');

        JSONSampleDataWithErrorDriveLink = await uploadJSONToGoogleDrive({
            buffer: jsonBuffer,
            fileName: `${site}-error.json`,
            mimeType: 'application/json',
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
            serviceAccountCredentials: JSON.parse(
                Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
            ),
        });

        console.log(`Uploaded invalid items to Google Drive: ${JSONSampleDataWithErrorDriveLink.webViewLink}`);

        JSONSampleDataWithErrorGitLink = await uploadCollection({
            fileName: site,
            data: invalidItems.filter((f, i) => i < 5),
            gitFolder: "ErrorSample",
            compress: false
        });
    }

    // Upload valid data samples
    console.log(`Uploading ${Math.min(dataWithoutError.length, 5)} valid data samples...`);

    const jsonBuffer2 = Buffer.from(JSON.stringify(dataWithoutError.filter((f, i) => i < 5), null, 2), 'utf-8');

    const ValidJSONSampleDataDriveLink = await uploadJSONToGoogleDrive({
        buffer: jsonBuffer2,
        fileName: `${site}.json`,
        mimeType: 'application/json',
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        serviceAccountCredentials: JSON.parse(
            Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
        ),
    });

    console.log('✅ JSON file uploaded to Google Drive:', ValidJSONSampleDataDriveLink.webViewLink);

    const ValidJSONSampleDataGitLink = await uploadCollection({
        fileName: site,
        data: dataWithoutError.filter((f, i) => i < 5),
        gitFolder: "validSample",
        compress: false
    });

    // Upload duplicate URL samples if any
    if (duplicateURLs.length > 1) {
        JSONSampleDataWithDuplicateUrlDataGitLink = await uploadCollection({
            fileName: site,
            data: duplicateURLs.filter((f, i) => i < 5),
            gitFolder: "duplicateUrl",
            compress: false
        });
    }

    return {
        // === OVERVIEW METRICS ===
        'Total Collected Items': data.length,
        'Total Valid Items': dataWithoutError.length,
        'Total Error Items': dataWithError.length,
        'Total Invalid Items': invalidItems.length,
        
        // === TIME SPAN ===
        'Start Timestamp': oldestTimestamp,
        'End Timestamp': newestTimestamp,
        'Minutes Span': minutesSpan,
        
        // === PAGE & CONTENT METRICS ===
        'Total Pages': totalPages.count || 0,
        'Total Unique Page URLs': uniquePageURLs.length,
        'Total Unique Items': totalUniqueItems.count || 0,
        'Total Duplicate URLs': duplicateURLs.length,
        
        // === VALIDATION ERRORS ===
        'Total Invalid Links': invalidLinks,
        'Total Invalid Titles': invalidTitles,
        'Total Invalid Page Titles': invalidPageTitles,
        'Total Invalid Images': invalidimgs,
        'Total Invalid Videos': invalidVideos,
        
        // === PRICE & AVAILABILITY ISSUES ===
        'Total Invalid Prices': invalidPrices,
        'Unset Prices': unsetPrices,
        'Price Scrape Errors': priceScrapeErrors,
        'Total Not Availables': totalNotAvailables,
        
        // === SAMPLE DATA LINKS ===
        'Valid Sample Data (Drive)': ValidJSONSampleDataDriveLink ? ValidJSONSampleDataDriveLink.webViewLink : 'N/A',
        'Valid Sample Data (Git)': ValidJSONSampleDataGitLink ? ValidJSONSampleDataGitLink.url : 'N/A',
        'Error Sample Data (Drive)': JSONSampleDataWithErrorDriveLink ? JSONSampleDataWithErrorDriveLink.webViewLink : 'N/A',
        'Error Sample Data (Git)': JSONSampleDataWithErrorGitLink ? JSONSampleDataWithErrorGitLink.url : 'N/A',
        'Duplicate URL Sample Data (Git)': JSONSampleDataWithDuplicateUrlDataGitLink ? JSONSampleDataWithDuplicateUrlDataGitLink.url : 'N/A',
    };
}