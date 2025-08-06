export default function findDuplicatesByLink(array) {
  const linkCount = {};
  const result = [];
  
  // Count occurrences of each link
  array.forEach(obj => {
    if (obj.link) {
      linkCount[obj.link] = (linkCount[obj.link] || 0) + 1;
    }
  });
  
  // Create result array with only duplicates (count > 1)
  Object.entries(linkCount).forEach(([url, count]) => {
    if (count > 1) {
      result.push({
        dublicateUrl: url,
        counter: count
      });
    }
  });
  
  // Sort by counter in descending order (largest first)
  result.sort((a, b) => b.counter - a.counter);
  
  return result;
}