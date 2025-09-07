import dotenv from 'dotenv';
import {processScrapedData} from './pushToGit.js'
dotenv.config({ silent: true });

await processScrapedData(process.env.site)