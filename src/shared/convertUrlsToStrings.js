export default function convertUrlsToStrings(urlArray) {
  return urlArray.map((item) => {
    if (typeof item === "string") {
      return item;
    } else if (typeof item === "object" && item !== null && "url" in item) {
      return item.url;
    } else {
      return ""; // Return empty string for invalid items
    }
  });
}
