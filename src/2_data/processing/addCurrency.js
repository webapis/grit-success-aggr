
/**
 * Identifies the currency from the price string and adds it as properties.
 * Adds currency both to individual price objects and the main product object.
 *
 * @param {object} productData - The product data object.
 * @returns {object} The product data object with currency properties added.
 */
function addCurrency(productData) {
  let mainCurrency = null;

  if (productData.price && productData.price.length > 0) {
    productData.price.forEach(price => {
      if (price.value) {
        const currencyMatch = price.value.match(/(TL|USD|EUR|₺|\$|€)/);
        if (currencyMatch) {
          let currency = currencyMatch[0];
          if (currency === '₺') {
            currency = 'TL';
          } else if (currency === '$') {
            currency = 'USD';
          } else if (currency === '€') {
            currency = 'EUR';
          }
          price.currency = currency;
          
          // Set the main currency from the first price if not already set
          if (!mainCurrency) {
            mainCurrency = currency;
          }
        }
      }
    });
  }

  // Add the currency to the main object if we found one
  if (mainCurrency) {
    productData.currency = mainCurrency;
  }

  return productData;
}

export default addCurrency;
