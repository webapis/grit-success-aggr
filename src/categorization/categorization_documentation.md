# Product Categorization System Documentation
# https://claude.ai/public/artifacts/8fd5488c-3bb2-4227-8797-a9e285c2dd80
## Table of Contents
1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)
7. [Matching Rules](#matching-rules)
8. [Query System](#query-system)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The **Keyword-Based Product Categorization System** automatically categorizes e-commerce products by matching keywords in product titles. It's specifically optimized for Turkish e-commerce platforms but supports multilingual keywords.

### Key Features
- ✅ **Automatic categorization** based on title keywords
- ✅ **Multi-language support** (Turkish/English)
- ✅ **Flexible query system** for finding categorized products
- ✅ **Performance optimized** with compiled regex patterns
- ✅ **Extensible** category definitions
- ✅ **Analytics & statistics** for data insights

---

## Installation & Setup

### Basic Setup
```javascript
// Import the system
const { KeywordCategorizer, DefaultCategories } = require('./keyword-categorization');

// Initialize with default categories
const categorizer = new KeywordCategorizer(DefaultCategories);

// Categorize your products
const categorizedProducts = categorizer.categorize(yourProductsArray);
```

### Custom Setup
```javascript
// Define custom categories
const customCategories = {
  brand: {
    'nike': ['nike', 'nike air', 'air jordan'],
    'adidas': ['adidas', 'three stripes', 'originals']
  },
  season: {
    'yaz': ['yaz', 'summer', 'yazlık'],
    'kış': ['kış', 'winter', 'kışlık']
  }
};

const customCategorizer = new KeywordCategorizer(customCategories);
```

---

## Core Concepts

### Product Structure
Your products should have at least a `title` field:
```javascript
const product = {
  title: "Pembe Dokulu Küçük Çanta +3 Renk",
  price: [{ numericValue: 1999.95 }],
  link: "https://example.com/product",
  // ... other fields
};
```

### Category Structure
Categories are organized in a hierarchical structure:
```javascript
{
  categoryType: {
    'categoryName': ['keyword1', 'keyword2', 'keyword3'],
    'anotherCategory': ['keyword4', 'keyword5']
  }
}
```

### Output Structure
After categorization, products get additional fields:
```javascript
{
  // ... original product fields
  categories: {
    gender: ['kadın'],
    productType: ['çanta'],
    color: ['pembe']
  },
  matched_keywords: {
    gender: ['kadın'],
    productType: ['çanta'],
    color: ['pembe']
  },
  categorization_score: 75 // Percentage of categories found
}
```

---

## API Reference

### KeywordCategorizer Class

#### Constructor
```javascript
new KeywordCategorizer(categoryDefinitions)
```
- **categoryDefinitions**: Object defining categories and their keywords

#### Methods

##### `categorize(products)`
Categorizes an array of products.
- **Parameters**: `products` - Array of product objects
- **Returns**: Array of categorized products
- **Example**:
```javascript
const categorized = categorizer.categorize(products);
```

##### `categorizeProduct(product)`
Categorizes a single product.
- **Parameters**: `product` - Single product object
- **Returns**: Categorized product object

##### `queryByCategory(categorizedProducts, queryParams)`
Query products by category criteria.
- **Parameters**: 
  - `categorizedProducts` - Array of categorized products
  - `queryParams` - Query criteria object
- **Returns**: Filtered array of products

##### `getCategoryStats(categorizedProducts)`
Get statistics about category distribution.
- **Returns**: Statistics object with counts per category

##### `findUncategorized(categorizedProducts, requiredCategoryTypes)`
Find products missing specific category types.
- **Parameters**: 
  - `categorizedProducts` - Array of categorized products
  - `requiredCategoryTypes` - Array of category types to check
- **Returns**: Array of products missing categories

##### `addKeywords(categoryType, categoryName, newKeywords)`
Add new keywords to existing categories.
- **Parameters**:
  - `categoryType` - Type of category (e.g., 'color')
  - `categoryName` - Name of specific category (e.g., 'pembe')
  - `newKeywords` - Array of new keywords to add

##### `suggestKeywords(uncategorizedProducts, categoryType)`
Analyze uncategorized products to suggest new keywords.
- **Returns**: Array of suggested keywords with frequency counts

---

## Configuration

### Default Categories

#### Gender Categories
```javascript
gender: {
  'kadın': ['kadın', 'bayan', 'women', 'woman', 'lady'],
  'erkek': ['erkek', 'bay', 'men', 'man', 'male'],
  'çocuk': ['çocuk', 'bebek', 'kids', 'child', 'baby'],
  'unisex': ['unisex', 'her iki cinsiyet']
}
```

#### Product Type Categories
```javascript
productType: {
  'çanta': ['çanta', 'bag', 'torba'],
  'omuz çantası': ['omuz çantası', 'shoulder bag', 'omuz'],
  'el çantası': ['el çantası', 'hand bag', 'clutch'],
  'ayakkabı': ['ayakkabı', 'shoes', 'bot', 'sandalet'],
  'elbise': ['elbise', 'dress'],
  // ... more types
}
```

#### Color Categories
```javascript
color: {
  'pembe': ['pembe', 'pink', 'rosa'],
  'mavi': ['mavi', 'blue', 'lacivert', 'navy'],
  'siyah': ['siyah', 'black', 'kara'],
  // ... more colors
}
```

### Adding Custom Categories
```javascript
// Add new category type
categorizer.categories.season = {
  'yaz': ['yaz', 'summer', 'yazlık'],
  'kış': ['kış', 'winter', 'kışlık']
};

// Recompile patterns after changes
categorizer.compiledPatterns = categorizer.compilePatterns();
```

---

## Usage Examples

### Basic Categorization
```javascript
const products = [
  { title: "Pembe Dokulu Küçük Çanta +3 Renk" },
  { title: "Erkek Deri Cüzdan Siyah" },
  { title: "Kadın Mavi Jean Ceket" }
];

const categorizer = new KeywordCategorizer(DefaultCategories);
const results = categorizer.categorize(products);

console.log(results[0].categories);
// Output: { color: ['pembe'], style: ['dokulu'], size: ['küçük'], productType: ['çanta'] }
```

### Querying Products
```javascript
// Find women's products
const womenProducts = categorizer.queryByCategory(categorizedProducts, {
  gender: 'kadın'
});

// Find pink or blue products
const colorfulProducts = categorizer.queryByCategory(categorizedProducts, {
  color: ['pembe', 'mavi']
});

// Find bags with specific criteria
const bags = categorizer.queryByCategory(categorizedProducts, {
  productType: { contains: ['çanta', 'omuz çantası'] }
});

// Complex query: Women's pink bags
const specificBags = categorizer.queryByCategory(categorizedProducts, {
  gender: 'kadın',
  color: 'pembe',
  productType: { contains: ['çanta'] }
});
```

### Getting Statistics
```javascript
const stats = categorizer.getCategoryStats(categorizedProducts);
console.log(stats);
// Output:
// {
//   gender: { kadın: 15, erkek: 8, çocuk: 2 },
//   color: { pembe: 5, mavi: 3, siyah: 7 },
//   productType: { çanta: 12, ayakkabı: 6, elbise: 4 }
// }
```

### Finding Uncategorized Products
```javascript
// Find products missing color information
const missingColor = categorizer.findUncategorized(categorizedProducts, ['color']);

// Find products missing any category
const poorlyCategorized = categorizedProducts.filter(p => p.categorization_score < 50);
```

---

## Matching Rules

### Word Boundary Matching
Keywords must match **complete words** only:

✅ **MATCHES:**
- `"Kadın Çanta"` matches keyword `"kadın"`
- `"Pembe-Çanta"` matches keyword `"pembe"`
- `"Çanta/Bag"` matches keyword `"çanta"`

❌ **NO MATCH:**
- `"Kadınlar"` does NOT match keyword `"kadın"` (partial word)
- `"Çantalık"` does NOT match keyword `"çanta"` (partial word)

### Case Insensitive
- `"KADIN ÇANTA"` matches keyword `"kadın"`
- `"pembe çanta"` matches keyword `"PEMBE"`

### Multiple Keywords (OR Logic)
For category `color: ['pembe', 'pink', 'rosa']`:
- Any of these keywords will trigger a match
- `"Pink Bag"` matches because `"pink"` is in the list

### Technical Implementation
```javascript
// Regex pattern created for matching:
const pattern = new RegExp(`\\b(keyword1|keyword2|keyword3)\\b`, 'gi');

// \b = word boundary
// | = OR operator
// gi = global, case-insensitive flags
```

---

## Query System

### Query Operators

#### Basic Matching
```javascript
// Exact match
{ gender: 'kadın' }

// Array of options (OR logic)
{ color: ['pembe', 'mavi', 'yeşil'] }
```

#### Advanced Operators
```javascript
// Contains any of the specified values
{ productType: { contains: ['çanta', 'omuz çantası'] } }

// Has any value in this category type
{ color: { any: true } }

// Has no values in this category type
{ material: { none: true } }
```

#### Complex Queries
```javascript
// Multiple conditions (AND logic by default)
{
  gender: 'kadın',
  color: ['pembe', 'kırmızı'],
  productType: { contains: ['çanta'] }
}
```

### Pre-built Query Helpers
```javascript
const { CategoryQueries } = require('./keyword-categorization');

// Common query patterns
CategoryQueries.womenProducts()        // { gender: 'kadın' }
CategoryQueries.byColor('pembe')       // { color: 'pembe' }
CategoryQueries.bags()                 // All bag types
CategoryQueries.byProductType('elbise') // { productType: 'elbise' }
```

---

## Best Practices

### 1. Category Design
- **Keep keywords specific** but not too narrow
- **Include variations**: `['çanta', 'bag', 'torba']`
- **Add common misspellings** if needed
- **Use lowercase** for consistency

### 2. Performance Optimization
```javascript
// Initialize once, use multiple times
const categorizer = new KeywordCategorizer(categories);

// Batch process products
const allCategorized = categorizer.categorize(allProducts);

// Then query as needed
const womenProducts = categorizer.queryByCategory(allCategorized, { gender: 'kadın' });
```

### 3. Data Quality
```javascript
// Check categorization quality
const lowScoreProducts = categorizedProducts.filter(p => p.categorization_score < 30);

// Find missing categories
const missingCategories = categorizer.findUncategorized(categorizedProducts, ['color', 'size']);

// Get keyword suggestions
const suggestions = categorizer.suggestKeywords(lowScoreProducts, 'color');
```

### 4. Extending Categories
```javascript
// Add keywords based on analysis
categorizer.addKeywords('color', 'turuncu', ['turuncu', 'orange', 'portakal']);

// Add new category types
categorizer.categories.occasion = {
  'günlük': ['günlük', 'casual', 'everyday'],
  'resmi': ['resmi', 'formal', 'business']
};
```

---

## Troubleshooting

### Common Issues

#### Keywords Not Matching
**Problem**: Keywords seem correct but not matching

**Debug**:
```javascript
const { MatchingTester } = require('./keyword-categorization');

// Test specific keyword
MatchingTester.testSingleKeyword("Product Title", "keyword");

// Test all categories
MatchingTester.testKeywordMatch("Product Title", categorizer);
```

**Common Causes**:
- Partial word matching (use word boundaries)
- Case sensitivity issues (system handles this automatically)
- Special characters in keywords (system escapes these)

#### Low Categorization Scores
**Problem**: Products have low categorization scores

**Solutions**:
```javascript
// Find products with low scores
const lowScore = products.filter(p => p.categorization_score < 50);

// Analyze common words in uncategorized products
const suggestions = categorizer.suggestKeywords(lowScore, 'productType');

// Add missing keywords
suggestions.forEach(suggestion => {
  if (suggestion.frequency > 5) { // Only high-frequency words
    // Add to appropriate category
  }
});
```

#### Performance Issues
**Problem**: Slow categorization with large datasets

**Solutions**:
- Process in batches
- Use compiled patterns (automatic)
- Cache results when possible
- Consider indexing for frequent queries

### Error Messages

#### "Unknown operator"
```javascript
// ❌ Wrong:
{ color: { invalidOperator: 'pembe' } }

// ✅ Correct:
{ color: { contains: ['pembe'] } }
{ color: 'pembe' }
```

#### "Cannot read property of undefined"
```javascript
// ❌ Product missing title:
{ price: 100 } // No title field

// ✅ Ensure title exists:
{ title: "Product Name", price: 100 }
```

### Debugging Tools

#### Test Matching
```javascript
// Test specific cases
MatchingTester.testKeywordMatch("Pembe Çanta", categorizer);
MatchingTester.showAllMatches("Product Title", categorizer);
```

#### Analyze Results
```javascript
// Get detailed statistics
const stats = categorizer.getCategoryStats(categorizedProducts);

// Find problematic products
const uncategorized = categorizer.findUncategorized(categorizedProducts);

// Performance monitoring
console.time('categorization');
const results = categorizer.categorize(products);
console.timeEnd('categorization');
```

---

## Advanced Usage

### Custom Matching Logic
```javascript
// Extend the categorizer for custom needs
class CustomCategorizer extends KeywordCategorizer {
  categorizeProduct(product) {
    const result = super.categorizeProduct(product);
    
    // Add custom logic
    if (product.price && product.price[0]?.numericValue > 5000) {
      if (!result.categories.priceRange) {
        result.categories.priceRange = [];
      }
      result.categories.priceRange.push('premium');
    }
    
    return result;
  }
}
```

### Integration with Databases
```javascript
// Example with MongoDB-like syntax
const categorizedProducts = categorizer.categorize(rawProducts);

// Save to database with categories
await db.products.insertMany(categorizedProducts);

// Query database using categories
const womensBags = await db.products.find({
  'categories.gender': { $in: ['kadın'] },
  'categories.productType': { $in: ['çanta'] }
});
```

### Real-time Categorization
```javascript
// For new products coming in real-time
function processNewProduct(product) {
  const categorized = categorizer.categorizeProduct(product);
  
  // Check if categorization is sufficient
  if (categorized.categorization_score < 40) {
    // Flag for manual review
    flagForReview(categorized);
  }
  
  return categorized;
}
```

---

This documentation provides comprehensive guidance for using the Product Categorization System effectively. For additional help or feature requests, refer to the source code or contact the development team.