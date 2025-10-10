import dotenv from 'dotenv';
import { deletePreviousSamples } from './cleanup-helpers.js';

dotenv.config();

const site = process.env.site;

async function main() {
    if (!site) {
        console.error('Error: `site` environment variable is not set. Please specify a site to clean up.');
        process.exit(1);
    }

    try {
        await deletePreviousSamples(site);
    } catch (error) {
        console.error(`💥 Fatal error during cleanup for site ${site}:`, error);
        process.exit(1);
    }
}

main();