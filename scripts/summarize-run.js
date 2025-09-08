import fs from 'fs/promises';
import path from 'path';

/**
 * Aggregates summary data from multiple JSON files into a single report.
 * @param {string} inputDir - The directory containing the JSON summary files.
 * @returns {Promise<object>} - The aggregated summary object.
 */
async function aggregateSummaries(inputDir) {
    console.log(`Reading summary files from: ${inputDir}`);
    const files = await fs.readdir(inputDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
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
            },
            errors: ['No summary files found.'],
        };
    }

    console.log(`Found ${jsonFiles.length} summary files to process.`);

    const allSummaries = [];
    for (const file of jsonFiles) {
        try {
            const filePath = path.join(inputDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            allSummaries.push(JSON.parse(content));
        } catch (error) {
            console.error(`Error reading or parsing ${file}:`, error);
        }
    }

    const aggregated = {
        totalSitesScraped: allSummaries.length,
        sites: allSummaries.map(s => s.Site || 'Unknown'),
        aggregatedMetrics: {
            'Total Collected Items': 0,
            'Total Valid Items': 0,
            'Total Error Items': 0,
            'Total Invalid Items': 0,
            'Total Duplicate URLs': 0,
            'Total Pages': 0,
            'Total Minutes Span': 0,
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
        aggregated.aggregatedMetrics['Total Minutes Span'] += parseFloat(summary['Minutes Span']) || 0;
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