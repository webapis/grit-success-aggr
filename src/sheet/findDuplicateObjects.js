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
  const duplicates = [];

  objectArray.forEach(obj => {
    if (obj.link && seen.has(obj.link)) {
      duplicates.push(obj);
    } else if (obj.link) {
      seen.add(obj.link);
    }
  });

  return duplicates;
}