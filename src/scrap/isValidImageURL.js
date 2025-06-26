export default function isValidImageURL(value) {
  const regex = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?$/i;
  const isValid = regex.test(value);

  if (!isValid) {
    console.warn("Invalid image URL:", value);
  }

  return isValid;
}