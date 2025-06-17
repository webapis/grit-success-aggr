const preNavigationHooks =  [
    async (crawlingContext, gotoOptions) => {
           gotoOptions.waitUntil = 'domcontentloaded';
  
        const { page } = crawlingContext;
       // await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.setDefaultNavigationTimeout(60000);

   


   
    
  

     
    },
]

export default preNavigationHooks