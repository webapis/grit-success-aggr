import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import { ensureBranchExists } from '../../shared/git/ensureBranchExists.js';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'webapis';
const REPO_NAME = 'grit-2-state';

/**
 * Takes a screenshot of the current page, uploads it to a specified GitHub repository,
 * and returns the URL to the image.
 *
 * @param {import('puppeteer').Page} page - The Puppeteer page object to screenshot.
 * @param {string} siteName - The name of the site, used for the filename and branch.
 * @returns {Promise<string|null>} The HTML URL of the uploaded screenshot, or null on failure.
 */
export async function uploadScreenshot(page, siteName) {
    if (!page || !GITHUB_TOKEN) {
        console.warn('Skipping screenshot: Page object not available or GH_TOKEN not set.');
        return null;
    }

    try {
        // Ensure the site-specific branch exists before uploading
        await ensureBranchExists(siteName);

        const screenshotBuffer = await page.screenshot({ fullPage: true });
        const base64Image = screenshotBuffer.toString('base64');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${siteName}-${timestamp}.png`;
        const path = `screenshots/${fileName}`;

        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({
                message: `feat: Add failure screenshot for ${siteName}`,
                content: base64Image,
                branch: siteName, // Upload to the site-specific branch
            }),
        });

        if (!response.ok) {
            throw new Error(`GitHub API responded with ${response.status}: ${await response.text()}`);
        }

        const responseData = await response.json();
        console.log(`✅ Successfully uploaded screenshot: ${responseData.content.html_url}`);
        return responseData.content.html_url;
    } catch (error) {
        console.error('❌ Failed to upload screenshot:', error.message);
        return null;
    }
}