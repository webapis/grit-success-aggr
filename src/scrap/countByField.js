export default function countByField(array, fieldName, expectedValue = false) {

  return array.filter(obj => obj[fieldName] === expectedValue).length;
}