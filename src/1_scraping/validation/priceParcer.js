import mapPrice from './mapPrice.js';
import addCurrency from '../../2_data/processing/addCurrency.js';
import { getCachedSiteConfigFromFile } from '../../config/siteConfig.js';

export default async function priceParser(item) {
    const siteConfig = await getCachedSiteConfigFromFile();
    const conversionRate = siteConfig ? siteConfig.conversionRate : null;

    const parsedPricePromises = Array.isArray(item.price)
        ? item.price.map(async priceObj => {
            try {
                const priceInfo = mapPrice(priceObj.value, {}, { returnObject: true });
                const priceWithCurrency = addCurrency({ price: [priceObj] });
                const currency = priceWithCurrency.price[0].currency;
                
                let convertedPrice = null;
                if (currency && currency !== 'TL' && conversionRate && priceInfo.value) {
                    convertedPrice = priceInfo.value * conversionRate;
                }

                return {
                    ...priceObj,
                    numericValue: priceInfo.value,
                    currency: currency,
                    unsetPrice: priceInfo.value === 0 ? true : false,
                    convertedPrice: convertedPrice
                };
            } catch (error) {
                return {
                    ...priceObj,
                    numericValue: 0,
                    priceScrapeError: true,
                    error: error.message
                };
            }
        })
        : [];

    const parsedPrices = await Promise.all(parsedPricePromises);

    const priceValid = parsedPrices.length > 0 && parsedPrices.every(p => typeof p.numericValue === 'number' && p.numericValue > 0);
    const priceisUnset = parsedPrices.some(p => p.unsetPrice);
    const priceScrapeError = parsedPrices.some(p => p.priceScrapeError);
    if (priceScrapeError || priceisUnset) {
        console.log('Invalid price data for item (and product is in stock):', parsedPrices);
    }

    return { parsedPrices, priceValid, priceisUnset, priceScrapeError };
}