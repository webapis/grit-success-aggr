import { uploadImage } from "../../git/uploadImage.js";
import logToLocalSheet from "../../sheet/logToLocalSheet.js";
const site = process.env.site || 'unknown-site';
export default async function uploadScreenShot({ page, fileNamePrefix }) {
    //take screenshot if initial pages could not be retrieved.


    //take screenshot if initial pages could not be retrieved.
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    // Upload directly to GitHub
    const result = await uploadImage({
        fileName: `${site}-${Date.now()}-${fileNamePrefix}.png`,  // Will become 'webpage-screenshot.png'
        imageBuffer: screenshotBuffer,   // Pass the buffer directly
        gitFolder: 'screenshots'
    })

    logToLocalSheet({ [`Screenshot${fileNamePrefix}`]: result.url });
}