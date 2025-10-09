import dotenv from 'dotenv';
import logToLocalSheet from '../../persistence/sheet/logToLocalSheet.js';
import { calculateMetrics } from './calculateMetrics.js';
import { uploadAnalysisSamples } from './uploadAnalysisSamples.js';
dotenv.config({ silent: true });

const site = process.env.site;

export default async function analyzeData(data) {
    const { debug } = logToLocalSheet();
    console.log('Analyzing data for site:', site);
    console.log(`debug: ${debug}`);

    // 1. Calculate all metrics and get data subsets
    const metrics = calculateMetrics(data);

    // 2. Upload samples and get back the links
    const sampleLinks = await uploadAnalysisSamples({ metrics, site, isDebug: debug });

    return {
        'Site': site,
        // === OVERVIEW METRICS ===
        'Total Collected Items': data.length,
        'Total Valid Items': metrics.dataWithoutError.length,
        'Total Error Items': metrics.dataWithError.length,
        'Total Invalid Items': metrics.invalidItems.length,

        // === TIME SPAN ===
        'Start Timestamp': metrics.oldestTimestamp,
        'End Timestamp': metrics.newestTimestamp,
        'Minutes Span': metrics.minutesSpan,

        // === PAGE & CONTENT METRICS ===
        'Total Pages': metrics.totalPages.count || 0,
        'Total Unique Page URLs': metrics.uniquePageURLs.length,
        'Total Unique Items': metrics.totalUniqueItems.count || 0,
        'Total Duplicate URLs': metrics.duplicateURLs.length,

        // === VALIDATION ERRORS ===
        'Total Invalid Links': metrics.totalInvalidLinks,
        'Total Invalid Titles': metrics.totalInvalidTitles,
        'Total Invalid Page Titles': metrics.totalInvalidPageTitles,
        'Total Invalid Images': metrics.totalInvalidImgs,
        'Total Invalid Videos': metrics.totalInvalidVideos,

        // === PRICE & AVAILABILITY ISSUES ===
        'Total Invalid Prices': metrics.totalInvalidPrices,
        'Unset Prices': metrics.totalUnsetPrices,
        'Price Scrape Errors': metrics.totalPriceScrapeErrors,
        'Total Not Availables': metrics.totalNotAvailables,
        'Currency Used': metrics.dataWithoutError.length > 0 ? metrics.dataWithoutError[0]?.price[0]?.currency || 'N/A' : 'N/A',

        // === SAMPLE DATA LINKS ===
        ...sampleLinks,
    };
}