
import itemCounterSelector from "../../selector-attibutes/itemCounterSelector.js";
import findBestSelector from "./findBestSelector.js";
export default async function getTotalItemsCount(page) {
    debugger
   const result =await findBestSelector(page, itemCounterSelector);
   debugger
   const { selector } = await result;
   debugger
   await page.waitForSelector(selector);

    const resultElement = await page.$eval(selector, el => el.textContent);
    const number = resultElement.trim().split(" ").filter(f => Number(f));

    console.log('getTotalItemsCount', number)
    debugger
    return number[0];
}

