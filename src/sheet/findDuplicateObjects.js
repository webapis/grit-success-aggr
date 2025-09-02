/**
 * Returns all duplicate objects based on link property (including all occurrences)
 * 
 * @param {Array} objectArray - Array of objects to check for duplicates
 * @returns {Array} - Array containing all objects that have duplicate links (including first occurrence)
 */
export function findDuplicateObjects(objectArray) {
  if (!Array.isArray(objectArray)) {
    return [];
  }

  // First pass: count occurrences of each link
  const linkCounts = {};
  objectArray.forEach(obj => {
    if (obj.link) {
      linkCounts[obj.link] = (linkCounts[obj.link] || 0) + 1;
    }
  });

  // Second pass: filter objects whose link appears more than once
  return objectArray.filter(obj => {
    return obj.link && linkCounts[obj.link] > 1;
  });
}