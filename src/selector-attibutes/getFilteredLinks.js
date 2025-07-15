export default async function getFilteredLinks(page, classNames, excludePatterns = []) {
  const hrefs = await page.evaluate((classNames, excludePatterns) => {
    return [...document.querySelectorAll("a")]
      .filter(a =>
      //  classNames.some(cls => a.classList.contains(cls)) &&
        !excludePatterns.some(pattern => a.href.includes(pattern))
      )
      .map(a => a.href).filter(href => href && href.length > 0);
  }, classNames, excludePatterns);
debugger; 
  return hrefs;
}
