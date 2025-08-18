export default function isValidVideoURL(value) {
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

    // Common video file extensions
    const extensionPattern = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v|3gp)(\?|$)/i;

    // CDN patterns for video hosting
    const cdnPattern = /cdn\/shop\/files\/[^?]+\?(.*width=\d+)/i;

    // YouTube patterns
    const youtubePattern = /(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]+/i;

    // Vimeo patterns
    const vimeoPattern = /(vimeo\.com\/|player\.vimeo\.com\/video\/)\d+/i;

    // Wistia patterns
    const wistiaPattern = /fast\.wistia\.(net|com)\/(embed\/iframe|v)\/[a-zA-Z0-9]+/i;

    // JW Player patterns
    const jwPlayerPattern = /content\.jwplatform\.com\/[a-zA-Z0-9]+/i;

    // Brightcove patterns
    const brightcovePattern = /players\.brightcove\.net\/\d+\/[a-zA-Z0-9_-]+\/index\.html/i;

    // Generic video streaming CDN patterns
    const streamingCdnPattern = /(cloudfront\.net|amazonaws\.com|cloudflare\.com).*\.(mp4|webm|m3u8|mpd)/i;

    // HLS and DASH streaming patterns
    const streamingPattern = /\.(m3u8|mpd)(\?|$)/i;

    // Cloudinary video pattern
    const cloudinaryVideoPattern = \/video\/upload\/[^/]*\/v\d+\//i;

    const isValid =
      basicPattern.test(value) &&
      (extensionPattern.test(value) || 
       cdnPattern.test(value) || 
       youtubePattern.test(value) ||
       vimeoPattern.test(value) ||
       wistiaPattern.test(value) ||
       jwPlayerPattern.test(value) ||
       brightcovePattern.test(value) ||
       streamingCdnPattern.test(value) ||
       streamingPattern.test(value) ||
       cloudinaryVideoPattern.test(value));

    if (!isValid) {
      console.warn("Invalid video URL:", value);
    }

    return isValid;
  } catch (err) {
    console.warn("Error in isValidVideoURL:", err);
    return false;
  }
}