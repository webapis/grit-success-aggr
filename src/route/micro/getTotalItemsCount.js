
import itemCounterSelector from "../../selector-attibutes/itemCounterSelector.js";
import findBestSelector from "./findBestSelector.js";
export default async function getTotalItemsCount(page) {
    debugger
   const {bestSelector} = findBestSelector(page, itemCounterSelector);
   await page.waitForSelector(bestSelector);

    const resultElement = await page.$eval(selector, el => el.textContent);
    const number = resultElement.trim().split(" ").filter(f => Number(f));

    console.log('getTotalItemsCount', number)
    debugger
    return number[0];
}

