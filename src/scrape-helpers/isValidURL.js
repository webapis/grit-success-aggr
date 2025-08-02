export default function isValidURL(value) {

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    console.warn("Invalid URL:", value);
    return false;
  }
  //previous
  // const regex = /^https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s]*)$/;
  // const isValid = regex.test(value);

  // if (!isValid) {
  //   console.warn("Invalid URL:", value);
  // }

  // return isValid;
}