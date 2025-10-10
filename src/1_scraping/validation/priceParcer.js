
import mapPrice from './mapPrice.js';
import addCurrency from '../../2_data/processing/addCurrency.js';

// --- FILTER FUNCTIONS ---

function getNumericValue(priceString) {
    const priceInfo = mapPrice(priceString, {}, { returnObject: true });
    return priceInfo.value;
}

function getCurrency(priceObj) {
    const priceWithCurrency = addCurrency({ price: [priceObj] });
    return priceWithCurrency.price[0].currency;
}

function applyConversion(numericValue, currency, conversionRate) {
    if (currency && currency !== 'TL' && conversionRate && numericValue) {
        return numericValue * conversionRate;
    }
    return null;
}

function formatForDisplay(value, currency, convertedValue) {
    const valueToDisplay = convertedValue !== null ? convertedValue : value;
    let formatCurrency = convertedValue !== null ? 'TRY' : currency;
    if (formatCurrency === 'TL') formatCurrency = 'TRY';

    if (typeof valueToDisplay !== 'number') return '';

    if (formatCurrency && ['TRY', 'USD', 'EUR'].includes(formatCurrency)) {
        try {
            return new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: formatCurrency
            }).format(valueToDisplay);
        } catch (e) {
            return `${valueToDisplay} ${currency}`;
        }
    }
    return `${valueToDisplay}`;
}

// --- PIPE FUNCTION for a single price object ---

function parsePrice(priceObj, siteConfig) {
    try {
        const numericValue = getNumericValue(priceObj.value);
        const currency = getCurrency(priceObj);
        const conversionRate = siteConfig ? siteConfig.conversionRate : null;

        if (!conversionRate && currency && currency !== 'TL') {
            console.log(`No conversion rate found for currency: ${currency}. Conversion skipped.`);
        }

        const convertedPrice = applyConversion(numericValue, currency, conversionRate);
        const displayPrice = formatForDisplay(numericValue, currency, convertedPrice);

        return {
            ...priceObj,
            numericValue,
            currency,
            unsetPrice: numericValue === 0,
            convertedPrice,
            displayPrice,
        };
    } catch (error) {
        return {
            ...priceObj,
            numericValue: 0,
            priceScrapeError: true,
            error: error.message
        };
    }
}

// --- MAIN ORCHESTRATOR ---

export default async function processAllPrices(item, siteConfig) {
    const parsedPricePromises = Array.isArray(item.price)
        ? item.price.map(priceObj => parsePrice(priceObj, siteConfig))
        : [];

    const parsedPrices = await Promise.all(parsedPricePromises);

    const priceValid = parsedPrices.length > 0 && parsedPrices.every(p => typeof p.numericValue === 'number' && p.numericValue > 0);
    const priceisUnset = parsedPrices.some(p => p.unsetPrice);
    const priceScrapeError = parsedPrices.some(p => p.priceScrapeError);

    if (priceScrapeError || priceisUnset) {
        console.log(`Invalid price data for item (link: ${item.link}):`, parsedPrices);
    }

    return { parsedPrices, priceValid, priceisUnset, priceScrapeError };
}
