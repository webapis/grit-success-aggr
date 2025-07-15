export default function priceParser(item) {
    const parsedPrices = Array.isArray(item.price)
        ? item.price.map(priceObj => {
            try {
                const numericPrice = mapPrice(priceObj.value); // or priceObj.rawValue if that is correct

                return {
                    ...priceObj,
                    numericValue: numericPrice
                };
            } catch (error) {
                return {
                    ...priceObj,
                    numericValue: 0,
                    error: error.message
                };
            }
        })
        : [];

    const priceValid = parsedPrices.length > 0 && parsedPrices.some(p => typeof p.numericValue === 'number' && p.numericValue > 0);
    if (!priceValid && !item.productNotInStock) {
        console.log('Invalid price data for item (and product is in stock):', item);
    }

    return parsedPrices

}