import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import analyzeData from '../src/2_data/processing/analize-data/analizeData.js';
import { pipe } from './pipe.js';

dotenv.config({ silent: true });

// --- Pipeline Stages ---

const initializeAnalysis = (context) => {
    const site = process.env.site;
    if (!site) {
        throw new Error('Error: "site" environment variable is not set. Please set it, e.g., "export site=example.com" or add it to your .env file');
    }

    console.log(`Initializing analysis for site: ${site}`);
    
    return {
        ...context,
        site,
        finalOutputFile: path.join(process.cwd(), 'artifacts', 'valid', 'valid-products.json'),
        analysisSummaryFile: path.join(process.cwd(), 'artifacts', 'analysis-summary.json'),
    };
};

const loadData = (context) => {
    const { finalOutputFile } = context;
    console.log(`Reading final merged data from: ${finalOutputFile}`);

    if (!fs.existsSync(finalOutputFile)) {
        throw new Error(`Error: Final data file not found at ${finalOutputFile}. Please ensure the merge process has run successfully.`);
    }

    const rawData = fs.readFileSync(finalOutputFile, 'utf-8');
    const data = JSON.parse(rawData);

    if (!data || data.length === 0) {
        console.log('No data found to analyze. Exiting gracefully.');
        // To stop the pipeline, you can throw a specific error or return a context with a flag
        // For simplicity, we'll let it proceed, and the next stage will handle the empty data.
    }

    console.log(`Found ${data.length} items. Starting analysis...`);
    return { ...context, data };
};

const performAnalysis = async (context) => {
    if (!context.data || context.data.length === 0) {
        return { ...context, analysisResult: { message: "No data to analyze." }, analysisSkipped: true };
    }

    const analysisResult = await analyzeData(context.data);
    return { ...context, analysisResult };
};

const saveAnalysisResults = (context) => {
    if (context.analysisSkipped) {
        console.log('Analysis was skipped, no results to save.');
        return context;
    }

    const { analysisSummaryFile, analysisResult } = context;
    console.log('\n--- Analysis Complete ---');

    const dir = path.dirname(analysisSummaryFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(analysisSummaryFile, JSON.stringify(analysisResult, null, 2));
    console.log(`Analysis results saved to ${analysisSummaryFile}`);
    console.log('-----------------------\n');
    return context;
};

const logResults = (context) => {
    if (context.analysisSkipped) {
        console.log('Final result: No analysis was performed.');
    } else {
        console.log('Final Analysis Results:');
        console.log(JSON.stringify(context.analysisResult, null, 2));
    }
    return context; // Return context for consistency
};

// --- Pipeline Definition ---

const analysisPipeline = pipe(
    initializeAnalysis,
    loadData,
    performAnalysis,
    saveAnalysisResults,
    logResults
);

// --- Main Execution ---

(async () => {
    try {
        await analysisPipeline({});
        console.log('✅ Analysis pipeline completed successfully.');
    } catch (error) {
        console.error('💥 An error occurred during the analysis pipeline:', error.message);
        process.exit(1);
    }
})();