export default function isValidImageURL(value) {
  if (typeof value !== 'string') return false;

  // Normalize protocol-relative URLs
  if (value.startsWith('//')) {
    value = 'https:' + value;
  }

  // Basic URL pattern
  const basicPattern = /^https?:\/\/[^\s]+$/i;

  // Check for known image extensions
  const extensionPattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?$/i;

  // Check for Shopify/Cloudinary-style image URLs
  const cdnPattern = /cdn\/shop\/files\/[^?]+\?(.*width=\d+)/i;

  const isValid =
    basicPattern.test(value) &&
    (extensionPattern.test(value) || cdnPattern.test(value));

  if (!isValid) {
    console.warn("Invalid image URL:", value);
  }

  return isValid;
}
