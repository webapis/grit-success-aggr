export default function extractUrls(array) {
    return array.map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (typeof item === 'object' && item.url) {
        return item.url;
      }
      return null;
    }).filter(url => url !== null);
  }