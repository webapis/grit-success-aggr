import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'webapis';
const REPO_NAME = 'grit-2-state';

// Cache for main branch SHA to reduce API calls
let cachedMainSha = null;

/**
 * Gets the main branch SHA, with caching to reduce API calls
 */
async function getMainBranchSha() {
    if (cachedMainSha) {
        return cachedMainSha;
    }

    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches/main`, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${GITHUB_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to get main branch info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    cachedMainSha = data.commit.sha;
    return cachedMainSha;
}

/**
 * Deletes a Git branch from the repository.
 * @param {string} branchName - The name of the branch to delete.
 */
async function deleteGitBranch(branchName) {
    if (!GITHUB_TOKEN) {
        throw new Error('GitHub token (GH_TOKEN) is not configured for branch deletion.');
    }

    // Safety check to prevent deleting the main branch
    if (branchName === 'main') {
        console.warn('Attempted to delete main branch. Operation skipped.');
        return;
    }

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${branchName}`;

    try {
        console.log(`Attempting to delete branch: ${branchName}...`);
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (response.status === 204) {
            console.log(`✅ Successfully deleted branch: ${branchName}`);
        } else if (response.status === 404 || response.status === 422) {
            console.log(`Branch ${branchName} not found. Nothing to delete.`);
        } else {
            throw new Error(`Failed to delete branch: ${response.status} ${await response.text()}`);
        }
    } catch (error) {
        console.error(`❌ Error deleting branch ${branchName}:`, error.message);
    }
}

/**
 * Creates a new branch from main
 * @param {string} branchName - The name of the branch to create
 * @param {string} mainSha - The SHA of the main branch commit
 */
async function createBranchFromMain(branchName, mainSha) {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
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

    if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 422 && errorBody.includes('Reference already exists')) {
            console.log(`Branch ${branchName} was created by another process, continuing...`);
            return;
        }
        throw new Error(`Failed to create branch ${branchName}: ${response.status} - ${errorBody}`);
    }
    console.log(`✅ Successfully created branch ${branchName}`);
}

/**
 * Deletes all previous analysis sample files for a given site.
 * @param {string} site - The name of the site.
 */
export async function deletePreviousSamples(site) {
    console.log(`🧹 Starting cleanup for site: ${site}. Attempting to delete and recreate branch...`);

    try {
        // Step 1: Get main branch SHA BEFORE deleting (saves an API call)
        console.log('Fetching main branch SHA...');
        const mainSha = await getMainBranchSha();
        console.log(`Got main branch SHA: ${mainSha.substring(0, 7)}...`);

        // Step 2: Delete the old branch if it exists
        await deleteGitBranch(site);

        // Step 3: Recreate branch using the cached SHA
        console.log(`Creating fresh branch '${site}' from main...`);
        await createBranchFromMain(site, mainSha);

        console.log(`✅ Finished cleanup and recreation of branch '${site}'.`);
    } catch (error) {
        console.error(`Error during cleanup for site ${site}:`, error.message);
        throw error;
    }
}