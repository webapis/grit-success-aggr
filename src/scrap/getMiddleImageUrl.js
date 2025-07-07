export default function getMiddleImageUrl(srcset, baseUrl = '') {
  try {
    const normalizeUrl = (url) => {
      url = url.trim();
      if (url.startsWith('//')) return 'https:' + url;
      if (url.startsWith('/')) return baseUrl.replace(/\/$/, '') + url;
      return url;
    };

    // Return early if no descriptors
    if (!srcset.includes(',') && !srcset.includes(' ')) {
      return normalizeUrl(srcset);
    }

    const regex = /([^,\s]+)\s+(\d+(?:\.\d+)?)(w|x)?/g;
    let match;
    const images = [];

    while ((match = regex.exec(srcset)) !== null) {
      const rawUrl = match[1];
      const num = parseFloat(match[2]);
      const unit = match[3] || 'x'; // default to 'x' if unit missing (rare case)

      const value = isNaN(num) ? null : (unit === 'w' ? num : num * 1000); // convert x to larger scale

      if (value) {
        images.push({
          url: normalizeUrl(rawUrl),
          value,
        });
      }
    }

    // fallback if parsing fails
    if (images.length === 0) return normalizeUrl(srcset);

    images.sort((a, b) => a.value - b.value);
    const middleIndex = Math.floor(images.length / 2);
    return images[images.length % 2 === 0 ? middleIndex - 1 : middleIndex].url;

  } catch (error) {
    console.warn('Error in getMiddleImageUrl:', error);
    return srcset;
  }
}
