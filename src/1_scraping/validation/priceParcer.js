import mapPrice from './mapPrice.js';
import addCurrency from '../../2_data/processing/addCurrency.js';
import { pipe } from '../../shared/pipe.js';

// --- PIPE STAGES ---

const getNumericValue = async (context) => {
    const { priceObj } = context;
    const priceInfo = mapPrice(priceObj.value, {}, { returnObject: true });
    return { ...context, numericValue: priceInfo.value };
};

const getCurrency = async (context) => {
    const { priceObj } = context;
    const priceWithCurrency = addCurrency({ price: [priceObj] });
    return { ...context, currency: priceWithCurrency.price[0].currency };
};

const applyConversion = async (context) => {
    const { numericValue, currency, siteConfig } = context;
    const conversionRate = siteConfig ? siteConfig.conversionRate : null;

    if (!conversionRate && currency && currency !== 'TL') {
        console.log(`No conversion rate found for currency: ${currency}. Conversion skipped.`);
    }

    const convertedPrice = (currency && currency !== 'TL' && conversionRate && numericValue)
        ? numericValue * conversionRate
        : null;

    return { ...context, convertedPrice };
};

const formatForDisplay = async (context) => {
    const { numericValue, currency, convertedPrice } = context;
    const valueToDisplay = convertedPrice !== null ? convertedPrice : numericValue;
    let formatCurrency = convertedPrice !== null ? 'TRY' : currency;
    if (formatCurrency === 'TL') formatCurrency = 'TRY';

    let displayPrice = '';
    if (typeof valueToDisplay === 'number') {
        if (formatCurrency && ['TRY', 'USD', 'EUR'].includes(formatCurrency)) {
            try {
                displayPrice = new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: formatCurrency
                }).format(valueToDisplay);
            } catch (e) {
                displayPrice = `${valueToDisplay} ${currency}`;
            }
        } else {
            displayPrice = `${valueToDisplay}`;
        }
    }

    return { ...context, displayPrice };
};

const assemblePriceResult = async (context) => {
    const { priceObj, numericValue, currency, convertedPrice, displayPrice } = context;
    return {
        ...priceObj,
        numericValue,
        currency,
        unsetPrice: numericValue === 0,
        convertedPrice,
        displayPrice,
    };
};

const handlePriceError = async (error, context) => {
    const { priceObj } = context;
    return {
        ...priceObj,
        numericValue: 0,
        priceScrapeError: true,
        error: error.message
    };
};

// --- PIPE FUNCTION for a single price object ---

const parsePricePipeline = pipe(
    getNumericValue,
    getCurrency,
    applyConversion,
    formatForDisplay,
    assemblePriceResult
);

async function parsePrice(priceObj, siteConfig) {
    try {
        return await parsePricePipeline({ priceObj, siteConfig });
    } catch (error) {
        return await handlePriceError(error, { priceObj });
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