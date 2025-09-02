/**
 * Returns all duplicate objects based on link property
 * 
 * @param {Array} objectArray - Array of objects to check for duplicates
 * @returns {Array} - Array containing all duplicate objects (excluding the first occurrence of each)
 */
export function findDuplicateObjects(objectArray) {
  if (!Array.isArray(objectArray)) {
    return [];
  }

  const seen = new Set();

  return objectArray.filter(obj => {
    if (obj.link && seen.has(obj.link)) {
      return true; // This is a duplicate
    }
    if (obj.link) {
      seen.add(obj.link);
    }
    return false; // This is not a duplicate
  });
}