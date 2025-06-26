export default function countByField(array, fieldName, expectedValue = false) {
    debugger
  return array.filter(obj => obj[fieldName] === expectedValue).length;
}