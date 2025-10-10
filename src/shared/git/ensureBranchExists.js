import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'webapis';
const REPO_NAME = 'grit-2-state';

/**
 * Checks GitHub API rate limit status
 */
async function checkRateLimit() {
    const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${GITHUB_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });
    
    if (response.ok) {
        const data = await response.json();
        return data.resources.core;
    }
    return null;
}

/**
 * Waits until rate limit resets
 */
async function waitForRateLimit(resetTime) {
    const now = Math.floor(Date.now() / 1000);
    const waitTime = (resetTime - now + 10) * 1000; // Add 10 seconds buffer
    
    if (waitTime > 0) {
        console.log(`⏳ Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

/**
 * Ensures that a specific branch exists in the GitHub repository.
 * If the branch does not exist, it creates it based on the 'main' branch.
 * @param {string} branchName - The name of the branch to check/create.
 * @param {number} retryCount - Number of retries attempted (for internal use)
 */
export async function ensureBranchExists(branchName, retryCount = 0) {
    if (!GITHUB_TOKEN) {
        throw new Error('GitHub token (GH_TOKEN) is not configured.');
    }

    try {
        console.log(`Checking if branch ${branchName} exists...`);

        // Check if branch exists
        const branchResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches/${branchName}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (branchResponse.ok) {
            console.log(`Branch ${branchName} already exists.`);
            return;
        }

        if (branchResponse.status === 404) {
            console.log(`Branch ${branchName} doesn't exist, creating it...`);

            // Get the main branch's latest commit SHA
            const mainBranchResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches/main`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                }
            });

            // Handle rate limit on main branch fetch
            if (mainBranchResponse.status === 403) {
                const rateLimitInfo = await checkRateLimit();
                if (rateLimitInfo && rateLimitInfo.remaining === 0) {
                    if (retryCount < 3) {
                        await waitForRateLimit(rateLimitInfo.reset);
                        return ensureBranchExists(branchName, retryCount + 1);
                    } else {
                        throw new Error('Rate limit exceeded after multiple retries');
                    }
                }
            }

            if (!mainBranchResponse.ok) {
                throw new Error(`Failed to get main branch info: ${mainBranchResponse.status} ${mainBranchResponse.statusText}`);
            }
            
            const mainBranchData = await mainBranchResponse.json();
            const mainSha = mainBranchData.commit.sha;

            // Create new branch from main
            const createBranchResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: mainSha,
                }),
            });

            if (!createBranchResponse.ok) {
                const errorBody = await createBranchResponse.text();
                if (createBranchResponse.status === 422 && errorBody.includes('Reference already exists')) {
                    console.log(`Branch ${branchName} was created by another process, continuing...`);
                    return;
                }
                throw new Error(`Failed to create branch ${branchName}: ${createBranchResponse.status} - ${errorBody}`);
            }
            console.log(`✅ Successfully created branch ${branchName}`);
        } else {
            throw new Error(`Failed to check branch existence: ${branchResponse.status} ${branchResponse.statusText}`);
        }
    } catch (error) {
        console.error(`Error ensuring branch ${branchName} exists:`, error.message);
        throw error;
    }
}