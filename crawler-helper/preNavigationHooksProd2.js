const preNavigationHooks =  [
    async (crawlingContext, gotoOptions) => {
         //  gotoOptions.waitUntil = 'domcontentloaded';
        const base64Data = 'UklGRrQCAABXRUJQVlA4WAoAAAAgAAAAMQAAMQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggxgAAADAFAJ0BKjIAMgA+KRSIQqGhIRQEABgChLSAAfEUsMdoQDxm7V7DY8pOCS0L/ZyItlBAAP78SglvPhcQmHd7faO6y1Vj5rGK48w1Px+0DDzmSmSYzbIU4V+7Fe49Jdh1s8ufvov/DhqMdLRQIsmNpwliL2KKjX3y+AjM9IY6ZBHFt/K3ZB9a92c7eC4FhJPj8CGJNQiCXYBrv/s2nqpZap2xm8BBq/aPjDKYsaw5MG8/sgZVfdCc1IZY+bxPEQplrVSOwAAAAA=='
        const buffer = Buffer.from(base64Data, 'base64');
        const { page } = crawlingContext;
       // await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.setDefaultNavigationTimeout(60000);
        await page.setRequestInterception(true);
        await page.evaluate(() => {
            navigator.geolocation.getCurrentPosition = () => {
              return {
                coords: {
                  latitude: 41.015137,
                  longitude: 28.979530,
                },
              };
            };
          });


        page.on('request', req => {
            const resourceType = req.resourceType();
            const url = req.url();

            
            if (resourceType === 'image'  ||url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.gif')|| url.endsWith('.webp')||url.endsWith("imformat=chrome")) {
                req.respond({
                    status: 200,
                    contentType: 'image/jpeg',
                    body: buffer
                });


            } else {
                req.continue();
            }
        });
        page.on('response', async response => {
            const request = response.request();



            const status = response.status()
            if (status === 200) {
                try {
                    const text = await response.text()
                    if (isJsonString(text)) {


                        const json = JSON.parse(text);
                        if (Array.isArray(json)) {

                       //     await Dataset.pushData({ arr: json });
                               //response.continue();

                        } else {

                         //   await Dataset.pushData(json);
                               //response.continue();
                        }



                    }
                } catch (error) {

                }

            }

        })

  

        function isJsonString(str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        }
    },
]

export default preNavigationHooks