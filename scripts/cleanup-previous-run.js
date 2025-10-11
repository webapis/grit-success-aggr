import dotenv from 'dotenv';
import { deletePreviousSamples } from './cleanup-helpers.js';
import { pipe } from './pipe.js';

dotenv.config();

// --- Pipeline Stages ---

const initialize = (context) => {
    const site = process.env.site;
    if (!site) {
        throw new Error('Error: `site` environment variable is not set. Please specify a site to clean up.');
    }
    console.log(`Initializing cleanup for site: ${site}`);
    return { ...context, site };
};

const deleteSamples = async (context) => {
    const { site } = context;
    await deletePreviousSamples(site);
    return { ...context, cleanupCompleted: true };
};

// --- Pipeline Definition ---

const cleanupPipeline = pipe(
    initialize,
    deleteSamples
);

// --- Main Execution ---

(async () => {
    try {
        await cleanupPipeline({});
        console.log('✅ Cleanup pipeline completed successfully.');
    } catch (error) {
        console.error('💥 An error occurred during the cleanup pipeline:', error.message);
        process.exit(1);
    }
})();
