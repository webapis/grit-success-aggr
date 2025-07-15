import mapPrice from './mapPrice.js';
export default function priceParser(item) {
    const parsedPrices = Array.isArray(item.price)
        ? item.price.map(priceObj => {
            try {
                const numericPrice = mapPrice(priceObj.value); // or priceObj.rawValue if that is correct
                return {
                    ...priceObj,
                    numericValue: numericPrice,
                    unsetPrice:  numericPrice=== 0? true: false,
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
    if (!priceScrapeError || priceisUnset) {
        console.log('Invalid price data for item (and product is in stock):', parsedPrices);
    }

    return { parsedPrices, priceValid, priceisUnset , priceScrapeError };

}