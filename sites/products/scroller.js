export default async function scroller(page, scrollSpeed, scrollTimes = 50) {
    page.on("console", (message) => {
      console.log("Message from Puppeteer page:", message.text());
    });
  
    await page.evaluate(async (_scrollSpeed, _scrollTimes) => {
      await new Promise((resolve, reject) => {
        var totalHeight = 0;
        var distance = 100;
        let inc = 0;
        let totalInterval = 0;
        
        var timer = setInterval(() => {
          var scrollHeight = document.body.scrollHeight;
          
          window.scrollBy(0, distance);
          totalHeight += distance;
          inc = inc + 1;
          totalInterval = totalInterval + 1;
          
          console.log("Scroll count", inc, "Total intervals", totalInterval);
          
          if (totalInterval >= _scrollTimes) {
            clearInterval(timer);
            resolve();
          }
          
          // Optional: Stop if reached bottom of page
          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, _scrollSpeed);
      });
    }, scrollSpeed, scrollTimes);
  }

  
export  async function autoScroll(page,scrollSpeed) {
  page.on("console", (message) => {
    console.log("Message from Puppeteer page:", message.text());
  });
  await page.evaluate(async (_scrollSpeed) => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      let inc = 0;
      let totalInterval =0
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;

        window.scrollBy(0, distance);
        totalHeight += distance;
        inc = inc + 1;
        totalInterval = totalInterval + 1;
        console.log("inc", inc, totalInterval);
        // if( totalInterval>=30){
        //   clearInterval(timer);
        //   resolve();
        // }else
        if (totalHeight >= scrollHeight - window.innerHeight) {
          if (inc === 50 ) {
            clearInterval(timer);
            resolve();
          }
        } else {
          inc = 0;
        }
      }, _scrollSpeed);
    });
  },scrollSpeed);
}

