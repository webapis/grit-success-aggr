import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { pipe } from './pipe.js';

dotenv.config({ silent: true });

// --- Helper Functions ---

async function findFilesRecursively(dir, fileName) {
    let results = [];
    try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of list) {
            const fullPath = path.resolve(dir, dirent.name);
            if (dirent.isDirectory()) {
                results = results.concat(await findFilesRecursively(fullPath, fileName));
            } else if (dirent.name === fileName) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        // Ignore errors like permission denied, which are common in CI environments
        console.warn(`Could not read directory ${dir}: ${error.message}`);
    }
    return results;
}

// --- Pipeline Stages ---

const initializeSummary = (context) => {
    const artifactsDir = process.argv[2] || './artifacts';
    console.log(`Starting summary aggregation in: ${artifactsDir}`)
    return {
        ...context,
        artifactsDir,
        outputFilePath: path.join(artifactsDir, 'final-summary.json'),
    };
};

const findSummaryFiles = async (context) => {
    const { artifactsDir } = context;
    console.log(`Recursively searching for 'upload-summary.json' in: ${artifactsDir}`);
    const jsonFilePaths = await findFilesRecursively(artifactsDir, 'upload-summary.json');

    if (jsonFilePaths.length === 0) {
        console.warn('No summary JSON files found to aggregate.');
    }

    console.log(`Found ${jsonFilePaths.length} summary files to process:`);
    jsonFilePaths.forEach(p => console.log(`  - ${p}`));

    return { ...context, jsonFilePaths };
};

const readSummaryFiles = async (context) => {
    const { jsonFilePaths } = context;
    const allSummaries = [];

    for (const filePath of jsonFilePaths) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            allSummaries.push(JSON.parse(content));
        } catch (error) {
            console.error(`Error reading or parsing ${path.basename(filePath)}:`, error);
        }
    }

    return { ...context, allSummaries };
};

const aggregateSummariesStage = (context) => {
    const { allSummaries } = context;

    const finalSummary = {
        totalSitesScraped: allSummaries.length,
        sites: allSummaries.map(s => s.Site || 'Unknown'),
        aggregatedMetrics: {
            'Total Sites Scraped': allSummaries.length,
            'runTimestamp': new Date().toISOString(),
            'branch': process.env.GITHUB_REF_NAME || 'local',
            'Total Collected Items': 0, 'Total Valid Items': 0, 'Total Error Items': 0,
            'Total Invalid Items': 0, 'Total Duplicate URLs': 0, 'Total Pages': 0,
            'Total Unique Items': 0, 'Total Minutes Span': 0,
            'sitesWithErrors': [], 'sitesWithNoItems': [], 'sitesWithInvalidItems': [],
            'totalSitesPaused': 0, 'totalSitesActive': 0,
        },
        individualSiteData: allSummaries,
    };

    for (const summary of allSummaries) {
        const metrics = finalSummary.aggregatedMetrics;
        metrics['Total Collected Items'] += summary['Total Collected Items'] || 0;
        metrics['Total Valid Items'] += summary['Total Valid Items'] || 0;
        metrics['Total Error Items'] += summary['Total Error Items'] || 0;
        metrics['Total Invalid Items'] += summary['Total Invalid Items'] || 0;
        metrics['Total Duplicate URLs'] += summary['Total Duplicate URLs'] || 0;
        metrics['Total Pages'] += summary['Total Pages'] || 0;
        metrics['Total Unique Items'] += summary['Total Unique Items'] || 0;
        metrics['Total Minutes Span'] += parseFloat(summary['Minutes Span']) || 0;

        const siteName = summary.Site || 'Unknown';
        if ((summary['Total Error Items'] || 0) > 0) {
            metrics.sitesWithErrors.push(`${siteName} (${summary['Total Error Items']})`);
        }
        if ((summary['Total Collected Items'] || 0) === 0) {
            metrics.sitesWithNoItems.push(`${siteName} (0)`);
        }
        if ((summary['Total Invalid Items'] || 0) > 0) {
            metrics.sitesWithInvalidItems.push(`${siteName} (${summary['Total Invalid Items']})`);
        }
        if (summary.Status === 'Paused') {
            metrics.totalSitesPaused += 1;
        } else {
            metrics.totalSitesActive += 1;
        }
    }

    finalSummary.aggregatedMetrics['Total Minutes Span'] = parseFloat(finalSummary.aggregatedMetrics['Total Minutes Span'].toFixed(2));

    return { ...context, finalSummary };
};

const saveFinalSummary = async (context) => {
    const { outputFilePath, finalSummary } = context;
    if (!finalSummary) {
        console.warn('Final summary is missing, skipping save.');
        return context;
    }
    await fs.writeFile(outputFilePath, JSON.stringify(finalSummary, null, 2));
    return context;
};

const logFinalSummary = (context) => {
    const { outputFilePath, finalSummary } = context;
    if (!finalSummary) {
        console.warn('Final summary is missing, nothing to log.');
        return context;
    }
    console.log('✅ Final aggregated summary created:');
    console.log(JSON.stringify(finalSummary.aggregatedMetrics, null, 2));
    console.log(`
Full report saved to: ${outputFilePath}`);
    return context;
};

// --- Pipeline Definition ---

const summarizePipeline = pipe(
    initializeSummary,
    findSummaryFiles,
    readSummaryFiles,
    aggregateSummariesStage,
    saveFinalSummary,
    logFinalSummary
);

// --- Main Execution ---

(async () => {
    try {
        await summarizePipeline({});
        console.log('\nSummary pipeline completed successfully.');
    } catch (error) {
        console.error('💥 An error occurred during the summary pipeline:', error);
        process.exit(1);
    }
})();
