export default function isValidURL(value) {
  const regex = /^https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s]*)$/;
  const isValid = regex.test(value);

  if (!isValid) {
    console.warn("Invalid URL:", value);
  }

  return isValid;
}