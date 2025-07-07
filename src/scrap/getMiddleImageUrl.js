export default function getMiddleImageUrl(srcset) {
  const normalizeUrl = (url) =>
    url.startsWith('//') ? 'https:' + url : url;

  // Return early if it's a single URL
  if (!srcset.includes(',') && !srcset.includes(' ')) {
    return normalizeUrl(srcset.trim());
  }

  const images = srcset
    .split(',')
    .map(item => {
      const [url, width] = item.trim().split(' ');
      return { url: normalizeUrl(url), width: parseInt(width.replace('w', '')) };
    })
    .sort((a, b) => a.width - b.width); // sort by width ascending

  const middleIndex = Math.floor(images.length / 2);
  return images[images.length % 2 === 0 ? middleIndex - 1 : middleIndex].url;
}
