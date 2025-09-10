import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
/**
 * Recursively finds all files with a specific name in a directory.
 * @param {string} dir - The directory to search.
 * @param {string} fileName - The name of the file to find.
 * @returns {Promise<string[]>} - A promise that resolves to an array of full file paths.
 */

dotenv.config({ silent: true });
async function findFilesRecursively(dir, fileName) {
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });

    for (const dirent of list) {
        const fullPath = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            results = results.concat(await findFilesRecursively(fullPath, fileName));
        } else if (dirent.name === fileName) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Aggregates summary data from multiple JSON files into a single report.
 * @param {string} inputDir - The directory containing the JSON summary files.
 * @returns {Promise<object>} - The aggregated summary object.
 */
async function aggregateSummaries(inputDir) {
    console.log(`Recursively searching for 'upload-summary.json' in: ${inputDir}`);
    const jsonFilePaths = await findFilesRecursively(inputDir, 'upload-summary.json');

    if (jsonFilePaths.length === 0) {
        console.warn('No summary JSON files found to aggregate.');
        return {
            totalSitesScraped: 0,
            sites: [],
            aggregatedMetrics: {
                'Total Collected Items': 0,
                'Total Valid Items': 0,
                'Total Error Items': 0,
                'Total Invalid Items': 0,
                'Total Duplicate URLs': 0,
                'Total Pages': 0,
                'Total Minutes Span': 0,
            },
            errors: ['No summary files found.'],
        };
    }

    console.log(`Found ${jsonFilePaths.length} summary files to process:`);
    jsonFilePaths.forEach(p => console.log(`  - ${p}`));

    const allSummaries = [];
    for (const filePath of jsonFilePaths) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            allSummaries.push(JSON.parse(content));
        } catch (error) {
            console.error(`Error reading or parsing ${path.basename(filePath)}:`, error);
        }
    }

    const aggregated = {
        totalSitesScraped: allSummaries.length,
        sites: allSummaries.map(s => s.Site || 'Unknown'),
        aggregatedMetrics: {
            'Total Sites Scraped': allSummaries.length,
            'runTimestamp': new Date().toISOString(),
            'branch': process.env.GITHUB_REF_NAME || 'local', // Add branch name here
            'Total Collected Items': 0,
            'Total Valid Items': 0,
            'Total Error Items': 0,
            'Total Invalid Items': 0,
            'Total Duplicate URLs': 0,
            'Total Pages': 0,
            'Total Unique Items': 0,
            'Total Minutes Span': 0,
            'sitesWithErrors': [],
            'sitesWithNoItems': [],
            'sitesWithInvalidItems': [],
            'totalSitesPaused': 0,
            'totalSitesActive': 0,
        },
        individualSiteData: allSummaries,
    };

    for (const summary of allSummaries) {
        aggregated.aggregatedMetrics['Total Collected Items'] += summary['Total Collected Items'] || 0;
        aggregated.aggregatedMetrics['Total Valid Items'] += summary['Total Valid Items'] || 0;
        aggregated.aggregatedMetrics['Total Error Items'] += summary['Total Error Items'] || 0;
        aggregated.aggregatedMetrics['Total Invalid Items'] += summary['Total Invalid Items'] || 0;
        aggregated.aggregatedMetrics['Total Duplicate URLs'] += summary['Total Duplicate URLs'] || 0;
        aggregated.aggregatedMetrics['Total Pages'] += summary['Total Pages'] || 0;
        aggregated.aggregatedMetrics['Total Unique Items'] += summary['Total Unique Items'] || 0;
        aggregated.aggregatedMetrics['Total Minutes Span'] += parseFloat(summary['Minutes Span']) || 0;

        // Check for sites with errors
        const totalErrorItems = summary['Total Error Items'] || 0;
        if (totalErrorItems > 0) {
            aggregated.aggregatedMetrics.sitesWithErrors.push(`${summary.Site || 'Unknown'} (${totalErrorItems})`);
        }
        // Check for sites with no collected items
        const totalCollectedItems = summary['Total Collected Items'] || 0;
        if (totalCollectedItems === 0) {
            aggregated.aggregatedMetrics.sitesWithNoItems.push(`${summary.Site || 'Unknown'} (0)`);
        }
        // Check for sites with invalid items
        const totalInvalidItems = summary['Total Invalid Items'] || 0;
        if (totalInvalidItems > 0) {
            aggregated.aggregatedMetrics.sitesWithInvalidItems.push(`${summary.Site || 'Unknown'} (${totalInvalidItems})`);
        }

        // Check for paused status
        if (summary.Status === 'Paused') {
            aggregated.aggregatedMetrics.totalSitesPaused += 1;
        } else {
            aggregated.aggregatedMetrics.totalSitesActive += 1;
        }
    }

    // Round the total minutes for readability
    aggregated.aggregatedMetrics['Total Minutes Span'] = parseFloat(aggregated.aggregatedMetrics['Total Minutes Span'].toFixed(2));

    return aggregated;
}

// Main execution block
(async () => {
    const artifactsDir = process.argv[2] || './artifacts';
    const outputFilePath = path.join(artifactsDir, 'final-summary.json');

    const finalSummary = await aggregateSummaries(artifactsDir);
    await fs.writeFile(outputFilePath, JSON.stringify(finalSummary, null, 2));

    console.log('✅ Final aggregated summary created:');
    console.log(JSON.stringify(finalSummary.aggregatedMetrics, null, 2));
    console.log(`\nFull report saved to: ${outputFilePath}`);
})();