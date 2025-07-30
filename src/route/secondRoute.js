




import scrapeData from "./helper/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";

export default async function second({
    page,

    addRequests,
}) {

    await addNextPagesToRequests({ page, addRequests });

    const data = await scrapeData({ page })

    return data

}