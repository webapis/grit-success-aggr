export default async function twoStepNavigation(page, {
  topLevelSelector,
  firstLevelSubmenuSelector,
  secondLevelSubmenuSelector // optional
}) {
  const collectedUrls = [];
debugger;
  const topLevelLinks = await page.$$(topLevelSelector);
debugger;
  for (const topLink of topLevelLinks) {
    await topLink.hover();
    await page.waitForSelector(firstLevelSubmenuSelector, { timeout: 2000 }).catch(() => {});

    const firstLevelItems = await page.$$(firstLevelSubmenuSelector);

    // Collect first-level submenu links
    const firstLevelUrls = await page.$$eval(firstLevelSubmenuSelector, links =>
      links.map(link => link.href)
    );
    collectedUrls.push(...firstLevelUrls);

    // If second-level selector is provided, do two-step
    if (secondLevelSubmenuSelector) {
      for (const firstLevelItem of firstLevelItems) {
        await firstLevelItem.hover();
        await page.waitForTimeout(300);

        const secondLevelItems = await page.$$(secondLevelSubmenuSelector);
        if (secondLevelItems.length > 0) {
          const secondLevelUrls = await page.$$eval(secondLevelSubmenuSelector, links =>
            links.map(link => link.href)
          );
          collectedUrls.push(...secondLevelUrls);
        }
      }
    }

    await page.waitForTimeout(500);
  }

  return [...new Set(collectedUrls)];
}
