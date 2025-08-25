export default function getUniquePageURLs({ data }) {
  const uniqueUrls = new Set();

  data.forEach(item => {
    if (item.pageURL) {
      // Strip query parameters from URL
      const urlWithoutQuery = item.pageURL.split('?')[0];
      uniqueUrls.add(urlWithoutQuery);
    }
  });

  return Array.from(uniqueUrls);
}