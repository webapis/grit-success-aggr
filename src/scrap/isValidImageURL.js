
export default function isValidImageURL(value) {
  try {
    if (typeof value !== 'string') return false;

    // Normalize protocol-relative URLs
    if (value.startsWith('//')) {
      value = 'https:' + value;
    }

    // Basic URL pattern
    const basicPattern = /^https?:\/\/[^\s]+$/i;

    // Known image extensions (with or without . before them, to support filenames like ...productnamejpeg)
    const extensionPattern = /(?:\.|[^a-z0-9])?(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;

    // Shopify/CDN-style pattern with width parameter
    const cdnPattern = /cdn\/shop\/files\/[^?]+\?(.*width=\d+)/i;

    const isValid =
      basicPattern.test(value) &&
      (extensionPattern.test(value) || cdnPattern.test(value));

    if (!isValid) {
      console.warn("Invalid image URL:", value);
    }

    return isValid;
  } catch (err) {
    console.warn("Error in isValidImageURL:", err);
    return value;
  }
}

// export default function isValidImageURL(value) {
//   if (typeof value !== 'string') return false;

//   // Normalize protocol-relative URLs
//   if (value.startsWith('//')) {
//     value = 'https:' + value;
//   }

//   // Basic URL pattern
//   const basicPattern = /^https?:\/\/[^\s]+$/i;

//   // Check for known image extensions
//   const extensionPattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?$/i;

//   // Check for Shopify/Cloudinary-style image URLs
//   const cdnPattern = /cdn\/shop\/files\/[^?]+\?(.*width=\d+)/i;

//   const isValid =
//     basicPattern.test(value) &&
//     (extensionPattern.test(value) || cdnPattern.test(value));

//   if (!isValid) {
//     console.warn("Invalid image URL:", value);
//   }

//   return isValid;
// }
