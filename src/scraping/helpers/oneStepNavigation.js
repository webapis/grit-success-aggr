export default async function oneStepNavigation(page, {
  topLevelSelector,
  submenuLinkSelector
}) {
  const collectedUrls = [];

  const navLinks = await page.$$(topLevelSelector);

  for (const navLink of navLinks) {
    await navLink.hover();

    // Wait for submenu links to appear, fail silently on timeout
    await page.waitForSelector(submenuLinkSelector, { timeout: 2000 }).catch(() => {});

    // Extract hrefs from all submenu links
    const submenuUrls = await page.$$eval(submenuLinkSelector, links =>
      links.map(link => link.href)
    );

    collectedUrls.push(...submenuUrls);
    await page.waitForTimeout(500); // Give time before moving to the next item
  }

  return [...new Set(collectedUrls)]; // Optional: remove duplicates
}


/*
const urls = await collectMenuUrls(page, {
  topLevelSelector: '.navigation__link.has-submenu-navigation-link.js-next-menu.js-nav-link',
  submenuLinkSelector: '.navigation__submenu__item__link'
});
*/