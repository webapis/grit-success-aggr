export default function findDuplicatesByLink(array) {
  const linkGroups = {};
  
  // Group objects by their link
  array.forEach((obj, index) => {
    if (obj.link) {
      if (!linkGroups[obj.link]) {
        linkGroups[obj.link] = [];
      }
      linkGroups[obj.link].push({
        ...obj, // Include all original object properties
        originalIndex: index // Add original index for reference
      });
    }
  });
  
  // Filter groups that have duplicates (more than 1 object) and flatten
  const duplicates = Object.entries(linkGroups)
    .filter(([url, objects]) => objects.length > 1)
    .flatMap(([url, objects]) => 
      objects.map(obj => ({
        title: obj.title,
        img: obj.img,
        primaryImg: obj.primaryImg,
        link: obj.link,
        price: obj.price,
        videos: obj.videos,
        productNotInStock: obj.productNotInStock,
        matchedInfo: obj.matchedInfo,
        pageTitle: obj.pageTitle,
        pageURL: obj.pageURL,
        timestamp: obj.timestamp,
        imgValid: obj.imgValid,
        linkValid: obj.linkValid,
        titleValid: obj.titleValid,
        pageTitleValid: obj.pageTitleValid,
        priceValid: obj.priceValid,
        videoValid: obj.videoValid,
        mediaType: obj.mediaType,
        originalIndex: obj.originalIndex, // Original position in array
        duplicateUrl: url, // The URL that's duplicated
        duplicateCount: objects.length, // How many times this URL appears
        duplicateGroup: objects.map(o => ({ // All objects that share this URL (without circular reference)
          title: o.title,
          link: o.link,
          originalIndex: o.originalIndex
        }))
      }))
    );
  
  // Sort by duplicate count (descending), then by original index (ascending)
  duplicates.sort((a, b) => {
    if (b.duplicateCount !== a.duplicateCount) {
      return b.duplicateCount - a.duplicateCount;
    }
    return a.originalIndex - b.originalIndex;
  });
  
  return duplicates;
}

// Alternative version if you prefer grouped results
export function findDuplicatesByLinkGrouped(array) {
  const linkGroups = {};
  
  // Group objects by their link
  array.forEach((obj, index) => {
    if (obj.link) {
      if (!linkGroups[obj.link]) {
        linkGroups[obj.link] = [];
      }
      linkGroups[obj.link].push({
        ...obj,
        originalIndex: index
      });
    }
  });
  
  // Return only groups with duplicates, sorted by count
  const duplicateGroups = Object.entries(linkGroups)
    .filter(([url, objects]) => objects.length > 1)
    .map(([url, objects]) => ({
      duplicateUrl: url,
      duplicateCount: objects.length,
      objects: objects
    }))
    .sort((a, b) => b.duplicateCount - a.duplicateCount);
  
  return duplicateGroups;
}

// Example usage:
/*
const yourData = [
  { title: "Product 1", link: "https://example.com/product1", price: "100" },
  { title: "Product 1 Copy", link: "https://example.com/product1", price: "100" },
  { title: "Product 2", link: "https://example.com/product2", price: "200" },
  { title: "Product 3", link: "https://example.com/product1", price: "150" }
];

// Flat result - each duplicate object with metadata
const flatDuplicates = findDuplicatesByLink(yourData);
console.log("Flat duplicates:", flatDuplicates);

// Grouped result - duplicates organized by URL
const groupedDuplicates = findDuplicatesByLinkGrouped(yourData);
console.log("Grouped duplicates:", groupedDuplicates);
*/