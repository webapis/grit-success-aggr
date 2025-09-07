


import dotenv from "dotenv";
import scrapeData from "../extraction/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";
import continueIfProductPage from "./helper/continueIfProductPage.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import logToLocalSheet from "../../2_data/persistence/sheet/logToLocalSheet.js";
import extractPageNumber from "./helper/extractPageNumber.js";
dotenv.config({ silent: true });

const site = process.env.site;

export default async function first(props) {
    const { page, addRequests, siteUrls, request: { url } } = props


    console.log('inside first route')


    const success = await continueIfProductPage({ page, siteUrls });
       const paginationParameterName = siteUrls?.paginationParameterName
    if (success) {
        const { productItemSelector } = logToLocalSheet()

        await scrollPageIfRequired({ page, siteUrls, routeName: "first" })
        await addNextPagesToRequests({ page, addRequests, siteUrls, url });
        const data = await scrapeData({ page, siteUrls, productItemSelector })
debugger
        const { pageItems = [], pageNumbers = [] } = logToLocalSheet()

        const mergePageItems = [...pageItems, data.length]
        const pageNumber = extractPageNumber(url, paginationParameterName) || 1
        logToLocalSheet({ pageItems: mergePageItems, pageNumbers: [...pageNumbers, pageNumber] })

        return data
    } else {
        const { pageItems = [], pageNumbers = [] } = logToLocalSheet()
        const pageNumber = extractPageNumber(url, paginationParameterName) || 1
        const mergePageItems = [...pageItems, 0]
        logToLocalSheet({ pageItems: mergePageItems, pageNumbers: [...pageNumbers, pageNumber] })
  
        return []
    }

}