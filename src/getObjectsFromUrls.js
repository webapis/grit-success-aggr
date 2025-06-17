export default function getObjectsFromUrls(urlArray) {
    return urlArray.filter(item => typeof item === 'object' && item !== null);
  }