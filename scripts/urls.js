import { validateUrls } from "./helpers/urlValidation.js";
import logToLocalSheet from '../src/2_data/persistence/sheet/logToLocalSheet.js';

export function prepareUrls(siteConfig, site) {
    console.log('🔍 Validating URLs for specific paths...');
    const { validUrls, invalidUrls } = validateUrls(siteConfig.urls);

    if (invalidUrls.length > 0) {
        console.error(`Found ${invalidUrls.length} invalid URLs (root-only paths):`);
        invalidUrls.forEach(url => console.error(`  - ${url}`));

        logToLocalSheet({ Status: 'Validation Error', Notes: `Found ${invalidUrls.length} invalid URLs: ${invalidUrls.join(', ')}` })
        if (validUrls.length === 0) {
            throw new Error(`All URLs for site ${site} are invalid (contain only root paths).`);
        }
    }

    return validUrls;
}