import { Readable } from 'stream';
import { uploadCollection } from "./uploadCollection.js";
import dotenv from 'dotenv';
import getAggrTimeSpan from "./sheet/getAggrTimeSpan.js";
import countUnique from "./sheet/countUnique.js";
import countByField from "./scrape-helpers/countByField.js";
import getUniquePageURLs from "./sheet/getUniquePageURLs.js";
import { emitAsync } from "./events.js";
import './listeners.js'; // ← This registers event handlers
import uploadJSONToGoogleDrive from "./drive/uploadJSONToGoogleDrive.js";
import { getCachedSiteConfigFromFile } from './helper/siteConfig.js';
import findDuplicatesByLink from './helper/findDuplicatesByLink.js';
import { getDatasetData, getDatasetItems } from './crawlee/datasetOperations.js';

dotenv.config({ silent: true });

/**
 * Process scraped data and generate summary statistics
 * @param {string} siteName - The site name to process
 * @returns {Promise<Object>} - Returns baseRowData object with all statistics
 */
export async function processScrapedData(siteName) {
    try {
        const site = siteName || process.env.site;
        
        if (!site) {
            throw new Error('Site name is required');
        }

        console.log(`Processing scraped data for site: ${site}`);

        // Get site configuration and data
        const siteUrls = await getCachedSiteConfigFromFile();
        const data = await getDatasetItems(site);
        const totalItemsPerPage = await getDatasetData('totalItemsPerPage');
        const totalItemsToCallect = await getDatasetData('totalItemsToBeCallected');

        // Filter data
        const dataWithoutError = data.filter(f => !f.error);
        const dataWithError = data.filter(f => f.error);

        // Calculate statistics
        const { oldestTimestamp, newestTimestamp, minutesSpan } = getAggrTimeSpan({ data });
        const totalPages = countUnique({ data, key: 'pageURL' });
        const totalUniqueObjects = countUnique({ data, key: 'link' });
        const validLinks = countByField(data, 'linkValid');
        const validimgs = countByField(data.filter(f=>f.mediaType === 'image'), 'imgValid');
        const validVideos = countByField(data.filter(f=>f.mediaType === 'video'), 'videoValid');
        const validTitle = countByField(data, 'titleValid');
        const validPageTitle = countByField(data, 'pageTitleValid');
        const validPrice = countByField(data, 'priceValid');
        const unsetPrice = countByField(data, 'priceisUnset', true);
        const priceScrapeError = countByField(data, 'priceScrapeError', true);
        const totalNotAvailable = countByField(data, 'productNotInStock', true);
        const dublicateURLs = findDuplicatesByLink(data);
        const totalItemsToBeCallected = totalItemsToCallect || 0;
        const uniquePageURLs = getUniquePageURLs({ data: dataWithoutError });

        // Find invalid items
        const invalidItems = data.filter(item =>
            !item.imgValid ||
            !item.linkValid ||
            !item.titleValid ||
            !item.pageTitleValid ||
            !item.priceValid
        );

        // Upload error samples if any
        let JSONErrorDrive = null;
        let JSONErrorGit = null;
        let JSONDublicateUrlDataGit = null;

        if (invalidItems.length > 0) {
            console.log(`Found ${invalidItems.length} invalid items, uploading samples...`);

            const jsonBuffer = Buffer.from(JSON.stringify(invalidItems.filter((f, i) => i < 5), null, 2), 'utf-8');

            JSONErrorDrive = await uploadJSONToGoogleDrive({
                buffer: jsonBuffer,
                fileName: `${site}-error.json`,
                mimeType: 'application/json',
                folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
                serviceAccountCredentials: JSON.parse(
                    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
                ),
            });

            console.log(`Uploaded invalid items to Google Drive: ${JSONErrorDrive.webViewLink}`);

            JSONErrorGit = await uploadCollection({
                fileName: site,
                data: invalidItems.filter((f, i) => i < 5),
                gitFolder: "ErrorSample",
                compress: false
            });
        }

        // Upload valid data samples
        console.log(`Uploading ${Math.min(dataWithoutError.length, 5)} valid data samples...`);
        
        const jsonBuffer = Buffer.from(JSON.stringify(dataWithoutError.filter((f, i) => i < 5), null, 2), 'utf-8');

        const JSONDataDrive = await uploadJSONToGoogleDrive({
            buffer: jsonBuffer,
            fileName: `${site}.json`,
            mimeType: 'application/json',
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
            serviceAccountCredentials: JSON.parse(
                Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf-8')
            ),
        });
        
        console.log('✅ JSON file uploaded to Google Drive:', JSONDataDrive.webViewLink);

        const JSONDataGit = await uploadCollection({
            fileName: site,
            data: dataWithoutError.filter((f, i) => i < 5),
            gitFolder: "validSample",
            compress: false
        });

        // Upload duplicate URL samples if any
        if (dublicateURLs.length > 1) {
            JSONDublicateUrlDataGit = await uploadCollection({
                fileName: site,
                data: dublicateURLs.filter((f, i) => i < 5),
                gitFolder: "dublicateUrl",
                compress: false
            });
        }

        // Upload valid products to main collection if site is not paused
        let uploadSuccess = false;
        if (!siteUrls.paused && dataWithoutError.length > 0) {
            console.log('✅ Collected data length:', dataWithoutError.length);
            const dataToUpload = dataWithoutError.filter(f => 
                f.linkValid && f.imgValid && f.titleValid && f.priceValid && !f.productNotInStock
            );
            console.log('✅ Data to upload length:', dataToUpload.length);
            
            if (dataToUpload.length > 0) {
                const response = await uploadCollection({
                    fileName: site || process.env.URL_CATEGORIES,
                    data: dataToUpload,
                    gitFolder: site,
                });
                uploadSuccess = true;
                console.log('✅ Main data collection uploaded successfully');
            }
        } else if (!siteUrls.paused) {
            console.warn('⚠️ No valid data collected.');
            if (dataWithError.length > 0) {
                console.warn('First error sample:', dataWithError[0]);
            }
        }

        // Build and return base row data
        const baseRowData = {
            Site: site,
            'Total Objects': dataWithoutError.length,
            'Invalid Titles': validTitle,
            'Invalid Page Titles': validPageTitle,
            'Invalid Links': validLinks,
            'Invalid Images': validimgs,
            'Invalid Videos': validVideos,
            'Invalid Prices': validPrice,
            'Unset Prices': unsetPrice,
            'Price Scrape Errors': priceScrapeError,
            'Product Not Available': totalNotAvailable,
            'TotalItemsToBeCallected': totalItemsToBeCallected,
            'TotalItemsPerPage': totalItemsPerPage || 0,
            'Total Unique Objects (by link)': totalUniqueObjects.count,
            'Error Objects': dataWithError.length,
            "JSONErrorGit": JSONErrorGit ? JSONErrorGit.url : 'N/A',
            "JSONErrorDrive": JSONErrorDrive ? JSONErrorDrive.webViewLink : 'N/A',
            "JSONDataGit": JSONDataGit ? JSONDataGit.url : 'N/A',
            "JSONDataDrive": JSONDataDrive ? JSONDataDrive.webViewLink : 'N/A',
            'Start Time': oldestTimestamp,
            'End Time': newestTimestamp,
            'Span (min)': minutesSpan,
            'Total Pages': totalPages.count,
            'Unique Page URLs': uniquePageURLs.length,
            'AutoScroll': siteUrls.isAutoScroll ? 'true' : 'false',
            'productPageSelector': dataWithoutError.length > 0 ? dataWithoutError[0].matchedInfo?.matchedPageSelector : 'N/A',
            'productItemSelector': dataWithoutError.length > 0 ? dataWithoutError[0].matchedInfo?.matchedProductItemSelectorManual : 'N/A',
            'JSONDublicateUrlDataGit': JSONDublicateUrlDataGit ? JSONDublicateUrlDataGit.url : 'N/A',
        };

        console.log(`✅ Data processing completed for site: ${site}`);
        return baseRowData;

    } catch (error) {
        console.error(`❌ Error processing data for site ${siteName}:`, error);
        
        // Return error data object
        return {
            Site: siteName || 'Unknown',
            Status: 'Processing Error',
            Error: error.message,
            ProcessedAt: new Date().toISOString(),
            'Total Objects': 0,
            'Error Objects': 0
        };
    }
}

// Legacy support - if this file is run directly, execute the original logic
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        try {
            const baseRowData = await processScrapedData(process.env.site);
            
            // Log to sheet for backward compatibility when run directly
            await emitAsync('log-to-sheet', {
                sheetTitle: baseRowData.Status === 'Processing Error' ? 'Crawl Logs(failed)' : 'Crawl Logs(success)',
                message: `Site ${baseRowData.Site} data processing completed`,
                rowData: baseRowData
            });
            
            console.log('✅ Processing completed and logged to sheet');
        } catch (error) {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        }
    })();
}