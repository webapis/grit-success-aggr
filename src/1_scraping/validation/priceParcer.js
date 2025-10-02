import mapPrice from './mapPrice.js';
import addCurrency from '../../2_data/processing/addCurrency.js';
export default function priceParser(item) {
    const parsedPrices = Array.isArray(item.price)
        ? item.price.map(priceObj => {
            try {
                const priceInfo = mapPrice(priceObj.value, {}, { returnObject: true });
                const priceWithCurrency = addCurrency({ price: [priceObj] });
                return {
                    ...priceObj,
                    numericValue: priceInfo.value,
                    currency: priceWithCurrency.price[0].currency,
                    unsetPrice:  priceInfo.value === 0 ? true: false,
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

    const priceValid = parsedPrices.length > 0 && parsedPrices.every(p => typeof p.numericValue === 'number' && p.numericValue > 0);
    const priceisUnset = parsedPrices.some(p => p.unsetPrice);
    const priceScrapeError = parsedPrices.some(p => p.priceScrapeError);
    if (priceScrapeError || priceisUnset) {
        console.log('Invalid price data for item (and product is in stock):', parsedPrices);
    }

    return { parsedPrices, priceValid, priceisUnset , priceScrapeError };

}