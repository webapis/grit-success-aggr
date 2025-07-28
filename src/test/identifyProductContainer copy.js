
//https://claude.ai/chat/41183548-0b3b-4b2c-923a-0807550735b5
import { JSDOM }  from 'jsdom'; // For Node.js; omit if running in a browser

/**
 * Identifies product containers in e-commerce HTML content
 * @param {string} htmlContent - The HTML content to analyze
 * @returns {Object|null} - Container information or null if not found
 */
function identifyProductContainer(htmlContent) {
  // Parse HTML content into a DOM
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Helper function to check if an element contains price-like content
  function isPriceElement(element) {
    const text = element.textContent.toLowerCase().trim();
    // Matches prices like $99.99, 99.99 TL, €50.00, etc.
    const pricePattern = /[\$€£₺¥]?\s*\d+([.,]\d{1,2})?\s*(tl|usd|eur|gbp|try|jpy)?/;
    return pricePattern.test(text) || 
           text.includes('price') || 
           text.includes('fiyat') || 
           text.includes('cost') ||
           text.includes('₺') ||
           text.includes('lira');
  }

  // Helper function to check if an element is likely a product title
  function isTitleElement(element) {
    const text = element.textContent.trim();
    return text.length > 5 && // Titles are usually longer than 5 characters
           text.length < 200 && // Titles are usually shorter than 200 characters
           !isPriceElement(element) && // Not a price
           !element.querySelector('img') && // Not an image container
           !text.match(/^\d+$/); // Not just numbers
  }

  // Helper function to check if an element is a product container candidate
  function isProductContainerCandidate(element) {
    // Check for product links (common patterns)
    const hasLink = element.querySelector('a[href*="/product"]') || 
                   element.querySelector('a[href*="/detail"]') ||
                   element.querySelector('a[href*="/item"]') ||
                   element.querySelector('a[href*="/p/"]');
    
    // Check for product images
    const hasImage = element.querySelector('img[src]');
    
    // Check for price information
    const hasPrice = Array.from(element.querySelectorAll('*')).some(isPriceElement);
    
    // Check for product titles
    const hasTitle = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6, span, a, div, p')).some(isTitleElement);

    // A container is likely if it has at least 3 of the 4 key features
    const features = [hasLink, hasImage, hasPrice, hasTitle];
    const featureCount = features.filter(Boolean).length;
    
    return featureCount >= 3;
  }

  // Helper function to get the topmost common parent of a set of elements
  function getTopmostCommonParent(elements) {
    if (!elements.length) return null;
    if (elements.length === 1) return elements[0];

    function getParents(element) {
      const parents = [];
      let current = element;
      while (current && current !== document.body) {
        parents.push(current);
        current = current.parentElement;
      }
      return parents;
    }

    const parentSets = elements.map(getParents);
    const commonParents = parentSets[0].filter(parent =>
      parentSets.every(set => set.includes(parent))
    );
    return commonParents[commonParents.length - 1]; // Return the topmost common parent
  }

  // Helper function to score class names (prioritize product-related terms)
  function getClassScore(className) {
    const productTerms = ['product', 'item', 'card', 'tile', 'wrapper', 'container', 'box'];
    const lowerClassName = className.toLowerCase();
    let score = 0;
    
    productTerms.forEach(term => {
      if (lowerClassName.includes(term)) score += 1;
    });
    
    return score;
  }

  // Step 1: Find all potential product containers
  const allElements = document.body.querySelectorAll('*');
  const candidates = Array.from(allElements).filter(element => {
    // Skip elements that are too high in the hierarchy
    const skipTags = ['body', 'html', 'main', 'section', 'header', 'nav', 'footer', 'aside'];
    if (skipTags.includes(element.tagName.toLowerCase())) return false;
    
    // Skip elements that are too small (likely not containers)
    const childCount = element.children.length;
    if (childCount < 2) return false;
    
    return isProductContainerCandidate(element);
  });

  console.log(`Found ${candidates.length} potential product container candidates`);

  // Step 2: Group candidates by class name to find repeated structures
  const classCount = {};
  const classScores = {};
  
  candidates.forEach(candidate => {
    const className = candidate.className || 'no-class';
    classCount[className] = (classCount[className] || 0) + 1;
    classScores[className] = getClassScore(className);
  });

  // Step 3: Filter candidates with common class names (likely product containers)
  const commonClasses = Object.keys(classCount).filter(className => 
    classCount[className] > 1 && className !== 'no-class'
  );

  // Sort by count and class score
  commonClasses.sort((a, b) => {
    const countDiff = classCount[b] - classCount[a];
    if (countDiff !== 0) return countDiff;
    return classScores[b] - classScores[a];
  });

  console.log('Common classes found:', commonClasses);
  console.log('Class counts:', classCount);

  // Step 4: Get the best matching containers
  let likelyContainers = [];
  
  if (commonClasses.length > 0) {
    const bestClass = commonClasses[0];
    likelyContainers = candidates.filter(candidate => 
      candidate.className === bestClass
    );
  } else {
    // Fallback: use all candidates if no common class found
    likelyContainers = candidates.slice(0, 5); // Limit to first 5 to avoid noise
  }

  // Step 5: Find the topmost common parent if needed
  const productContainer = likelyContainers.length > 0 ? likelyContainers[0] : null;

  // Step 6: Return the identified container's information
  if (productContainer) {
    const result = {
      tagName: productContainer.tagName,
      className: productContainer.className,
      selector: productContainer.className
        ? `.${productContainer.className.replace(/\s+/g, '.')}`
        : productContainer.tagName.toLowerCase(),
      count: classCount[productContainer.className] || 1,
      confidence: calculateConfidence(productContainer, likelyContainers.length)
    };
    
    console.log('Identified container:', result);
    return result;
  }

  console.log('No suitable product container found');
  return null;

  // Helper function to calculate confidence score
  function calculateConfidence(container, containerCount) {
    let confidence = 0;
    
    // More containers = higher confidence
    if (containerCount > 5) confidence += 0.3;
    else if (containerCount > 2) confidence += 0.2;
    else confidence += 0.1;
    
    // Product-related class names = higher confidence
    const className = container.className.toLowerCase();
    if (className.includes('product')) confidence += 0.3;
    if (className.includes('item')) confidence += 0.2;
    if (className.includes('card')) confidence += 0.2;
    
    // Has all 4 features = higher confidence
    const hasLink = container.querySelector('a[href*="/product"]') || container.querySelector('a[href*="/detail"]');
    const hasImage = container.querySelector('img[src]');
    const hasPrice = Array.from(container.querySelectorAll('*')).some(isPriceElement);
    const hasTitle = Array.from(container.querySelectorAll('*')).some(isTitleElement);
    
    const features = [hasLink, hasImage, hasPrice, hasTitle].filter(Boolean).length;
    confidence += (features / 4) * 0.3;
    
    return Math.min(confidence, 1.0); // Cap at 1.0
  }
}

// Example usage
function testProductContainer() {
  const sampleHTML = ``;
  
  const result = identifyProductContainer(sampleHTML);
  console.log('Test result:', result);
  return result;
}

// Export for use in other modules
export { identifyProductContainer, testProductContainer };

// Browser version (if not using Node.js)
if (typeof module === 'undefined') {
  // Remove JSDOM dependency for browser
  function identifyProductContainerBrowser(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    // ... rest of the function logic (same as above but using doc instead of dom.window.document)
  }
}