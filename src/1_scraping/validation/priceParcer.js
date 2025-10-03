import mapPrice from './mapPrice.js';
import addCurrency from '../../2_data/processing/addCurrency.js';

export default async function priceParser(item, siteConfig) {
    const conversionRate = siteConfig ? siteConfig.conversionRate : null;

    const parsedPricePromises = Array.isArray(item.price)
        ? item.price.map(async priceObj => {
            try {
                const priceInfo = mapPrice(priceObj.value, {}, { returnObject: true });
                const priceWithCurrency = addCurrency({ price: [priceObj] });
                const currency = priceWithCurrency.price[0].currency;

                if (!conversionRate && currency && currency !== 'TL') {
                    console.log(`No conversion rate found in siteConfig for currency: ${currency}. Conversion will be skipped.`);
                }

                let convertedPrice = null;
                if (currency && currency !== 'TL' && conversionRate && priceInfo.value) {
                    convertedPrice = priceInfo.value * conversionRate;
                }

                let displayPrice = '';
                const valueToDisplay = convertedPrice !== null ? convertedPrice : priceInfo.value;
                let formatCurrency = convertedPrice !== null ? 'TRY' : currency;
                if (formatCurrency === 'TL') formatCurrency = 'TRY';

                if (typeof valueToDisplay === 'number' && formatCurrency && ['TRY', 'USD', 'EUR'].includes(formatCurrency)) {
                    try {
                        displayPrice = new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: formatCurrency
                        }).format(valueToDisplay);
                    } catch (e) {
                        displayPrice = `${valueToDisplay} ${currency}`;
                    }
                } else if (typeof valueToToDisplay === 'number') {
                    displayPrice = `${valueToDisplay}`;
                }

                return {
                    ...priceObj,
                    numericValue: priceInfo.value,
                    currency: currency,
                    unsetPrice: priceInfo.value === 0 ? true : false,
                    convertedPrice: convertedPrice,
                    displayPrice: displayPrice
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