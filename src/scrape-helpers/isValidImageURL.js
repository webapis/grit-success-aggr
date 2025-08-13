export default function isValidImageURL(value) {
  try {
    if (typeof value !== 'string') return false;

    if (value.startsWith('//')) {
      value = 'https:' + value;
    }

    // Handle encoding
    try {
      const decoded = decodeURI(value);
      value = encodeURI(decoded);
    } catch {
      value = encodeURI(value);
    }

    const basicPattern = /^https?:\/\/[^\s]+$/i;

    const extensionPattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;

    const cdnPattern = /cdn\/shop\/files\/[^?]+\?(.*width=\d+)/i;

    // Burberry/Akamai Image Server style
    const burberryPattern = /\/is\/image\/[^/]+\/[^?]+\?.+/i;

    // Cloudinary CDN pattern
    const cloudinaryPattern = /\/image\/upload\/[^/]*\/v\d+\//i;

    const isValid =
      basicPattern.test(value) &&
      (extensionPattern.test(value) || 
       cdnPattern.test(value) || 
       burberryPattern.test(value) || 
       cloudinaryPattern.test(value));

    if (!isValid) {
      console.warn("Invalid image URL:", value);
    }

    return isValid;
  } catch (err) {
    console.warn("Error in isValidImageURL:", err);
    return false;
  }
}



// export default function isValidImageURL(value) {
//   try {
//     if (typeof value !== 'string') return false;

//     // Normalize protocol-relative URLs
//     if (value.startsWith('//')) {
//       value = 'https:' + value;
//     }

//     // Apply encodeURI only if the value is not already encoded
//     // This avoids double encoding (e.g., %20 -> %2520)
//     try {
//       // decode first to check if it's already encoded
//       const decoded = decodeURI(value);
//       value = encodeURI(decoded);
//     } catch (e) {
//       // fallback: if decoding fails (e.g., malformed), try encoding directly
//       value = encodeURI(value);
//     }

//     // Basic URL pattern
//     const basicPattern = /^https?:\/\/[^\s]+$/i;

//     // Known image extensions (with or without . before them, to support filenames like ...productnamejpeg)
//     const extensionPattern = /(?:\.|[^a-z0-9])?(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;

//     // Shopify/CDN-style pattern with width parameter
//     const cdnPattern = /cdn\/shop\/files\/[^?]+\?(.*width=\d+)/i;

//     const isValid =
//       basicPattern.test(value) &&
//       (extensionPattern.test(value) || cdnPattern.test(value));

//     if (!isValid) {
//       console.warn("Invalid image URL:", value);
//     }

//     return isValid;
//   } catch (err) {
//     console.warn("Error in isValidImageURL:", err);
//     return false;
//   }
// }

// export default function isValidImageURL(value) {
//   try {
//     if (typeof value !== 'string') return false;

//     // Normalize protocol-relative URLs
//     if (value.startsWith('//')) {
//       value = 'https:' + value;
//     }

//     // Basic URL pattern
//     const basicPattern = /^https?:\/\/[^\s]+$/i;

//     // Known image extensions (with or without . before them, to support filenames like ...productnamejpeg)
//     const extensionPattern = /(?:\.|[^a-z0-9])?(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;

//     // Shopify/CDN-style pattern with width parameter
//     const cdnPattern = /cdn\/shop\/files\/[^?]+\?(.*width=\d+)/i;

//     const isValid =
//       basicPattern.test(value) &&
//       (extensionPattern.test(value) || cdnPattern.test(value));

//     if (!isValid) {
//       console.warn("Invalid image URL:", value);
//     }

//     return isValid;
//   } catch (err) {
//     console.warn("Error in isValidImageURL:", err);
//     return value;
//   }
// }

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
