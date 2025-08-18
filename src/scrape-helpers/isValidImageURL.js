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

