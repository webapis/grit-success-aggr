export default async function scrollNTimes(page, numScrolls, scrollAmount) {
  page.on("console", (message) => {
    console.log("Message from Puppeteer page:", message.text());
  });
  for (let i = 0; i < numScrolls; i++) {
    await page.evaluate((scrollAmount) => {
      window.scrollBy(0, scrollAmount);
    }, scrollAmount);
    console.log("scrollAmount", scrollAmount, i);
    await page.waitForTimeout(2000);
  }
}
