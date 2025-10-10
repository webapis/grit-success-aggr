import { uploadScreenshot } from '../src/2_data/persistence/uploadScreenshot.js';
import logToLocalSheet from '../src/2_data/persistence/sheet/logToLocalSheet.js';

const site = process.env.site;

/**
 * Custom error class to signal a critical 403 block.
 */
export class ForbiddenError extends Error {
    constructor(message, request, screenshotUrl) {
        super(message);
        this.name = 'ForbiddenError';
        this.request = request;
        this.screenshotUrl = screenshotUrl;
    }
}

/**
 * Handles a permanent request failure (e.g., timeout).
 * Takes a screenshot and logs the failure details locally.
 */
export async function handleRequestFailure({ request, error, page }) {
    console.error(`💀 Request permanently failed after ${request.retryCount + 1} attempts: ${request.url} - ${error.message}`);
    const screenshotUrl = await uploadScreenshot(page, site);
    const failureReason = `Request failed: ${error.message}`;
    logToLocalSheet({
        Status: 'Request Failed',
        Notes: failureReason,
        url: request.url,
        screenshotUrl: screenshotUrl || 'N/A',
    });
}

/**
 * Handles a 403 Forbidden error by taking a screenshot and throwing a custom error.
 */
export async function handleForbiddenError({ request, page }) {
    console.log('🚫 Detected 403 Forbidden error - possible anti-bot protection');
    const screenshotUrl = await uploadScreenshot(page, site);
    throw new ForbiddenError('Site is protected by anti-bot measures.', request, screenshotUrl);
}