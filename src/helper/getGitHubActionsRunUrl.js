export default function getGitHubActionsRunUrl() {
    if (!process.env.GITHUB_ACTIONS) {
        return null; // Not running in GitHub Actions
    }

    const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const repository = process.env.GITHUB_REPOSITORY;
    const runId = process.env.GITHUB_RUN_ID;

    if (repository && runId) {
        return `${serverUrl}/${repository}/actions/runs/${runId}`;
    }

    return null;
}