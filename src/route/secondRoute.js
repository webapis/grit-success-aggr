




import scrapeData from "./helper/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";

export default async function second({
    page,

    addRequests,
    siteUrls
}) {
debugger
    await addNextPagesToRequests({ page, addRequests,siteUrls });

    const data = await scrapeData({ page,siteUrls })

    return data

}