export default function isValidText(value) {
  if (typeof value !== 'string') {
    console.warn("Invalid text (not a string):", value);
    return false;
  }

  const trimmed = value.trim();
  const isValid = trimmed.length > 0 && trimmed.toLowerCase() !== 'undefined' && trimmed.toLowerCase() !== 'null';

  if (!isValid) {
    console.warn("Invalid text value:", value);
  }

  return isValid;
}
