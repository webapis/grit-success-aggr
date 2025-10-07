const preNavigationHooks =  [
    async (crawlingContext, gotoOptions) => {
           gotoOptions.waitUntil = 'domcontentloaded';
  
        const { page } = crawlingContext;
       // await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.setDefaultNavigationTimeout(60000);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
        });
    },
]

export default preNavigationHooks