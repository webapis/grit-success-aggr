export default function getMiddleImageUrl(srcset, baseUrl = '') {
  try {
    const normalizeUrl = (url) => {
      url = url.trim();

      // Case 1: Protocol-relative → add https:
      if (url.startsWith('//')) {
        return 'https:' + url;
      }

      // Case 2: Relative path → add base URL
      if (url.startsWith('/')) {
        return baseUrl.replace(/\/$/, '') + url;
      }

      // Case 3: Already absolute
      return url;
    };

    // Return early if it's a single URL with no size descriptors
    if (!srcset.includes(',') && !srcset.includes(' ')) {
      return normalizeUrl(srcset);
    }

    const images = srcset
      .split(',')
      .map(item => {
        const [url, width] = item.trim().split(' ');
        return {
          url: normalizeUrl(url),
          width: parseInt(width.replace('w', ''), 10)
        };
      })
      .filter(img => !isNaN(img.width))
      .sort((a, b) => a.width - b.width);

    const middleIndex = Math.floor(images.length / 2);
    return images[images.length % 2 === 0 ? middleIndex - 1 : middleIndex].url;

  } catch (error) {
    console.warn('Error in getMiddleImageUrl:', error);
    return srcset;
  }
}
