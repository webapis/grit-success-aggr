




import scrapeData from "./helper/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";

export default async function second({
    page,
    waitForSeconds = 0,
    addRequests,
}) {
    page.on("console", (message) => {
        console.log("Message from Puppeteer page:", message.text());
    });

    if (waitForSeconds > 0) {
        await page.evaluate(async (seconds) => {
            await new Promise(resolve => setTimeout(resolve, seconds * 1)); // Wait for specified seconds
        }, waitForSeconds);
    }
    //next pages
    await addNextPagesToRequests({ page, addRequests });
    //-------------------------------------------------------------------------------------------------------------
    // Check if there are any product items on the page
    const data = await scrapeData({ page })

    return data



    //-------------------------------------------------------------------------------------------------------------

}