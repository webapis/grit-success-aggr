export default function getMiddleImageUrl(srcset) {
  // Return early if it's just a single URL
  if (!srcset.includes(',') && !srcset.includes(' ')) {
    return srcset.trim();
  }

  const images = srcset
    .split(',')
    .map(item => {
      const [url, width] = item.trim().split(' ');
      return { url, width: parseInt(width.replace('w', '')) };
    })
    .sort((a, b) => a.width - b.width); // Sort from smallest to largest

  const middleIndex = Math.floor(images.length / 2);

  // If even number, prefer the lower-middle one
  return images[images.length % 2 === 0 ? middleIndex - 1 : middleIndex].url;
}
