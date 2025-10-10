import fs from 'fs';
import { emitAsync } from '../../../shared/events.js';
import logToLocalSheet from '../../persistence/sheet/logToLocalSheet.js';

const site = process.env.site;

/**
 * Reports a failure to external systems (Google Sheets, GitHub Actions).
 * @param {object} failureDetails - The details of the failure.
 */
async function reportFailure({ finalStatus, failureReason, url, screenshotUrl, githubRunUrl, statusOutput }) {
    console.log(`Reporting failure: ${finalStatus} - ${failureReason}`);

    const rowData = {
        site: site,
        url: url || 'N/A',
        timestamp: new Date().toISOString(),
        githubRunUrl: githubRunUrl,
        screenshotUrl: screenshotUrl || 'N/A',
        reason: failureReason,
        failureType: finalStatus,
    };

    await emitAsync('log-to-sheet', {
        sheetTitle: 'crawler-failures',
        message: `Site ${site} failed: ${failureReason}`,
        rowData,
    });

    if (process.env.GITHUB_OUTPUT && statusOutput) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${statusOutput}\n`);
    }
}

/**
 * Analyzes crawler stats and logs to determine the final run status and report it.
 * @param {import('crawlee').CrawlerStats} stats - The crawler statistics.
 * @param {number} duration - The total run duration in seconds.
 * @param {string} githubRunUrl - The URL for the GitHub Actions run.
 */
export async function summarizeAndReportRun({ stats, duration, githubRunUrl }) {
    const statsJson = stats.toJSON();
    const totalRequests = statsJson.requestsFinished;
    const successfulRequests = totalRequests - statsJson.requestsFailed;
    const failedRequests = statsJson.requestsFailed;
    const allRequestsFailed = totalRequests > 0 && totalRequests === failedRequests;
    const someRequestsFailed = failedRequests > 0 && successfulRequests > 0;

    const finalLocalSheetData = logToLocalSheet();
    const isCriticalFailure = ['No Product Selector', 'Invalid Data'].includes(finalLocalSheetData.Status);

    if (allRequestsFailed || isCriticalFailure) {
        // --- COMPLETE FAILURE ---
        const isInvalidData = finalLocalSheetData.Status === 'Invalid Data';
        let statusOutput, finalStatus;

        if (allRequestsFailed) {
            statusOutput = 'complete_failure';
            finalStatus = 'Complete Failure';
        } else if (isInvalidData) {
            statusOutput = 'invalid_data';
            finalStatus = 'Invalid Data';
        } else { // 'No Product Selector'
            statusOutput = 'selector_failure';
            finalStatus = 'Selector Failure';
        }

        const failureReason = allRequestsFailed
            ? `All ${totalRequests} requests failed during the run.`
            : finalLocalSheetData.Notes || 'No details provided';

        await reportFailure({ finalStatus, failureReason, url: finalLocalSheetData.url, screenshotUrl: finalLocalSheetData.screenshotUrl, githubRunUrl, statusOutput });
        logToLocalSheet({ Duration: duration, Status: finalStatus, Notes: failureReason });

    } else if (someRequestsFailed) {
        // --- PARTIAL FAILURE ---
        const finalStatus = 'Partial Failure';
        const failureReason = `${failedRequests} out of ${totalRequests} requests failed.`;

        await reportFailure({
            finalStatus,
            failureReason,
            url: 'Multiple URLs',
            screenshotUrl: 'N/A',
            githubRunUrl,
            statusOutput: 'partial_failure'
        });
        logToLocalSheet({ Duration: duration, Status: finalStatus, Notes: failureReason });

    } else {
        // --- SUCCESS ---
        console.log(`✅ Crawler completed for site: ${site} in ${duration} seconds`);
        console.log(`Stats: ${successfulRequests}/${totalRequests} successful, ${failedRequests} failed`);
        logToLocalSheet({ Duration: duration, Status: 'Success' });
    }
}