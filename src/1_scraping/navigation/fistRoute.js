


import dotenv from "dotenv";
import scrapeData from "../extraction/scrapeData.js";
import addNextPagesToRequests from "./helper/addNextPagesToRequests.js";
import updateTotalItemsToBeCallected from "./helper/updateTotalItemsToBeCallected.js";
import { scrollPageIfRequired } from "./helper/scrollPageIfRequired.js";
import logToLocalSheet from "../../2_data/persistence/sheet/logToLocalSheet.js";
import extractPageNumber from "./helper/extractPageNumber.js";

dotenv.config({ silent: true });

const site = process.env.site;

export default async function first(props) {
    const { page, addRequests, siteUrls, request: { url } } = props


    console.log('inside first route')


  
    const paginationParameterName = siteUrls.configurations[0]?.paginationParameterName

    const { productItemSelector } = logToLocalSheet()
   await updateTotalItemsToBeCallected({ page, siteUrls });
    await scrollPageIfRequired({ page, siteUrls, routeName: "first" })
    await addNextPagesToRequests({ page, addRequests, siteUrls, url });
    const data = await scrapeData({ page, siteUrls, productItemSelector })
    debugger
    const { pageItems = [], pageNumbers = [] } = logToLocalSheet()

    const mergePageItems = [...pageItems, data.length]
    const pageNumber = extractPageNumber(url, paginationParameterName) || 1
    logToLocalSheet({ pageItems: mergePageItems, pageNumbers: [...pageNumbers, pageNumber] })
    console.log('data', data.length)
    return data


}