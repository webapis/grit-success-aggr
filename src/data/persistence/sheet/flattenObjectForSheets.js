/**
 * Flattens a nested object structure for Google Sheets upload
 * 
 * @param {Object} obj - The object to flatten
 * @param {Object} options - Configuration options
 * @param {string} options.separator - Separator for nested keys (default: '_')
 * @param {string} options.arraySeparator - Separator for array values (default: ' | ')
 * @param {number} options.maxArrayItems - Maximum array items to include (default: 10)
 * @param {boolean} options.includeArrayIndices - Whether to create separate columns for array items (default: false)
 * @param {string} options.prefix - Prefix for all keys (default: '')
 * @returns {Object} - Flattened object
 */
export function flattenObjectForSheets(obj, options = {}) {
  const {
    separator = '_',
    arraySeparator = ' | ',
    maxArrayItems = 10,
    includeArrayIndices = false,
    prefix = ''
  } = options;

  const result = {};

  function flatten(current, keyPrefix = '') {
    if (current === null || current === undefined) {
      if (keyPrefix) {
        result[keyPrefix] = '';
      }
      return;
    }

    // Handle arrays
    if (Array.isArray(current)) {
      if (current.length === 0) {
        result[keyPrefix] = '';
        return;
      }

      // Option 1: Create separate columns for each array item
      if (includeArrayIndices) {
        current.slice(0, maxArrayItems).forEach((item, index) => {
          const indexKey = `${keyPrefix}${separator}${index}`;
          if (typeof item === 'object' && item !== null) {
            flatten(item, indexKey);
          } else {
            result[indexKey] = item;
          }
        });
      }

      // Option 2: Join array values into a single column (always include this)
      const joinedKey = includeArrayIndices ? `${keyPrefix}${separator}joined` : keyPrefix;
      
      // Handle array of objects vs array of primitives
      if (current.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
        // Array of objects - create JSON strings or flatten each
        result[joinedKey] = current.slice(0, maxArrayItems)
          .map(item => JSON.stringify(item))
          .join(arraySeparator);
      } else {
        // Array of primitives
        result[joinedKey] = current.slice(0, maxArrayItems)
          .map(item => String(item))
          .join(arraySeparator);
      }

      // Add array length info
      result[`${keyPrefix}${separator}count`] = current.length;
      
      return;
    }

    // Handle objects
    if (typeof current === 'object' && current !== null) {
      const keys = Object.keys(current);
      
      if (keys.length === 0) {
        result[keyPrefix] = '';
        return;
      }

      keys.forEach(key => {
        const newKey = keyPrefix ? `${keyPrefix}${separator}${key}` : key;
        flatten(current[key], newKey);
      });
      return;
    }

    // Handle primitives
    result[keyPrefix] = current;
  }

  flatten(obj, prefix);
  return result;
}

/**
 * Specialized flattener for the product data structure you provided
 * 
 * @param {Object} productData - Product data object
 * @returns {Object} - Flattened object optimized for your data structure
 */
export function flattenProductForSheets(productData) {
  const flattened = {};

  // Basic fields
  flattened.title = productData.title || '';
  flattened.primaryImg = productData.primaryImg || '';
  flattened.link = productData.link || '';
  flattened.pageTitle = productData.pageTitle || '';
  flattened.pageURL = productData.pageURL || '';
  flattened.timestamp = productData.timestamp || '';
  flattened.productNotInStock = productData.productNotInStock || false;
  flattened.mediaType = productData.mediaType || '';

  // Handle images array
  if (productData.img && Array.isArray(productData.img)) {
    flattened.img_all = productData.img.join(' | ');
    flattened.img_count = productData.img.length;
    
    // Add individual image columns (up to 5)
    productData.img.slice(0, 5).forEach((imgUrl, index) => {
      flattened[`img_${index + 1}`] = imgUrl;
    });
  }

  // Handle videos array
  if (productData.videos && Array.isArray(productData.videos)) {
    flattened.videos_all = productData.videos.join(' | ');
    flattened.videos_count = productData.videos.length;
  } else {
    flattened.videos_all = '';
    flattened.videos_count = 0;
  }

  // Handle price array
  if (productData.price && Array.isArray(productData.price) && productData.price.length > 0) {
    const priceObj = productData.price[0];
    flattened.price_value = priceObj.value || '';
    flattened.price_numeric = priceObj.numericValue || 0;
    flattened.price_selector = priceObj.selector || '';
    flattened.price_attribute = priceObj.attribute || '';
    flattened.price_isJavaScript = priceObj.isJavaScript || false;
    flattened.price_isShadowDOM = priceObj.isShadowDOM || false;
    flattened.price_unsetPrice = priceObj.unsetPrice || false;
  }

  // Handle matchedInfo object
  if (productData.matchedInfo) {
    const matched = productData.matchedInfo;
    flattened.matchedInfo_linkSource = matched.linkSource || '';
    flattened.matchedInfo_matchedSelector = matched.matchedSelector || '';
    flattened.matchedInfo_titleSelectorMatched = matched.titleSelectorMatched || '';
    flattened.matchedInfo_imgSelectorMatched = matched.imgSelectorMatched || '';
    flattened.matchedInfo_videoSelectorMatched = matched.videoSelectorMatched || '';
    flattened.matchedInfo_bestPriceSelector = matched.bestPriceSelector || '';
    flattened.matchedInfo_priceExtractedFromShadowDOM = matched.priceExtractedFromShadowDOM || false;
  }

  // Handle validation flags
  flattened.imgValid = productData.imgValid || false;
  flattened.linkValid = productData.linkValid || false;
  flattened.titleValid = productData.titleValid || false;
  flattened.pageTitleValid = productData.pageTitleValid || false;
  flattened.priceValid = productData.priceValid || false;
  flattened.videoValid = productData.videoValid || false;

  return flattened;
}

/**
 * Bulk flatten multiple objects for sheets upload
 * 
 * @param {Array} objectArray - Array of objects to flatten
 * @param {Object} options - Flattening options
 * @returns {Array} - Array of flattened objects
 */
export function bulkFlattenForSheets(objectArray, options = {}) {
  if (!Array.isArray(objectArray)) {
    throw new Error('Input must be an array of objects');
  }

  return objectArray.map(obj => flattenObjectForSheets(obj, options));
}

/**
 * Bulk flatten product data specifically
 * 
 * @param {Array} productArray - Array of product objects
 * @returns {Array} - Array of flattened product objects
 */
export function bulkFlattenProductsForSheets(productArray) {
  if (!Array.isArray(productArray)) {
    throw new Error('Input must be an array of product objects');
  }

  return productArray.map(product => flattenProductForSheets(product));
}

/**
 * Get all possible column headers from an array of objects (useful for consistent headers)
 * 
 * @param {Array} objectArray - Array of objects
 * @param {Object} options - Flattening options
 * @returns {Array} - Array of all possible column headers
 */
export function getAllPossibleHeaders(objectArray, options = {}) {
  if (!Array.isArray(objectArray)) {
    throw new Error('Input must be an array of objects');
  }

  const allHeaders = new Set();
  
  objectArray.forEach(obj => {
    const flattened = flattenObjectForSheets(obj, options);
    Object.keys(flattened).forEach(key => allHeaders.add(key));
  });

  return Array.from(allHeaders).sort();
}

// Example usage and test
export function testFlattener() {
  const testData = {
    "title": "Kadın Papağan İşlemeli Hasır Çanta - Koton X Sibil Çetinkaya",
    "img": [
      "https://ktnimg2.mncdn.com/products/2025/07/02/3105851/5c9772f9-2873-4614-8e50-3d7822395b45_size354x464.jpg",
      "https://ktnimg2.mncdn.com/products/2025/07/02/3105851/5c9772f9-2873-4614-8e50-3d7822395b45_size708x930.jpg"
    ],
    "price": [
      {
        "value": "1.199,99 TL",
        "numericValue": 1199.99
      }
    ],
    "matchedInfo": {
      "linkSource": "titleElement",
      "matchedSelector": ".product-item"
    }
  };

  console.log('Original:', testData);
  console.log('Generic Flattened:', flattenObjectForSheets(testData));
  console.log('Product Flattened:', flattenProductForSheets(testData));

  return {
    generic: flattenObjectForSheets(testData),
    product: flattenProductForSheets(testData)
  };
}