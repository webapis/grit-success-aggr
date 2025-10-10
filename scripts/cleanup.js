import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'webapis';
const REPO_NAME = 'grit-2-state';

/**
 * Deletes a specific file from a GitHub repository branch.
 * @param {string} site - The site name, used as the branch name.
 * @param {string} gitFolder - The folder in the repository where the file resides.
 */
async function deleteGitFile(site, gitFolder) {
    if (!GITHUB_TOKEN) {
        console.warn(`Skipping deletion from ${gitFolder}: GH_TOKEN not set.`);
        return;
    }

    const branchName = site;
    const fileName = `${site}.json`; // uploadAnalysisSamples.js uses compress=false
    const path = `${gitFolder}/${fileName}`;
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

    try {
        // First, get the file's SHA, which is required for deletion.
        const getResponse = await fetch(`${apiUrl}?ref=${branchName}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (getResponse.status === 404) {
            console.log(`File not found in ${path} on branch ${branchName}. Nothing to delete.`);
            return;
        }

        if (!getResponse.ok) {
            throw new Error(`Failed to get file info: ${getResponse.status} ${await getResponse.text()}`);
        }

        const { sha } = await getResponse.json();

        // Now, delete the file using its SHA.
        const deleteResponse = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({
                message: `chore: Remove previous analysis sample ${fileName}`,
                sha: sha,
                branch: branchName,
            }),
        });

        if (deleteResponse.ok) {
            console.log(`✅ Successfully deleted previous sample: ${path}`);
        } else {
            throw new Error(`Failed to delete file: ${deleteResponse.status} ${await deleteResponse.text()}`);
        }
    } catch (error) {
        console.error(`❌ Error deleting file from ${path}:`, error.message);
    }
}

/**
 * Deletes all previous analysis sample files for a given site.
 * @param {string} site - The name of the site.
 */
export async function deletePreviousSamples(site) {
    console.log(`🧹 Deleting previous analysis samples for site: ${site}...`);
    const sampleFolders = ["ErrorSample", "validSample", "duplicateUrl", "cssselectors"];

    for (const folder of sampleFolders) {
        await deleteGitFile(site, folder);
    }
    console.log('Finished cleanup of previous samples.');
}