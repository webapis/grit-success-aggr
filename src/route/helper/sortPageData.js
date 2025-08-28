export default function sortPageData(pageItems, pageNumbers) {
  // Create an array of objects to maintain the relationship between page numbers and items
  const combined = pageNumbers.map((pageNum, index) => ({
    pageNumber: pageNum,
    items: pageItems[index]
  }));
  
  // Sort by page number
  combined.sort((a, b) => a.pageNumber - b.pageNumber);
  
  // Extract the sorted arrays
  const sortedPageNumbers = combined.map(item => item.pageNumber);
  const sortedPageItems = combined.map(item => item.items);
  
  return {
    pageNumbers: sortedPageNumbers,
    pageItems: sortedPageItems
  };
}

// Example usage:
const pageItems = [24, 16, 24];
const pageNumbers = [1, 3, 2];

const result = sortPageData(pageItems, pageNumbers);
console.log(result);
// Output: { pageNumbers: [1, 2, 3], pageItems: [24, 24, 16] }