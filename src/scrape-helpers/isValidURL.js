export default function isValidURL(value) {
  // Keywords to reject - URLs containing these will be considered invalid
  const forbiddenKeywords = [
    'login',
    'auth',
    'facebook',
    'twitter',
    'instagram',
    'linkedin',
    'google',
    'signin',
    'signup',
    'register',
    'account',
    'profile',
    'settings',
    'admin',
    'api',
    'oauth',
    'social',
    'share',
    'cart',
    'checkout',
    'payment',
    'billing'
  ];

  try {
    const url = new URL(value);

    // Check if protocol is valid
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    // Convert URL to lowercase for case-insensitive comparison
    const urlString = value.toLowerCase();

    // // Check if URL contains any forbidden keywords
    // const containsForbiddenKeyword = forbiddenKeywords.some(keyword => 
    //   urlString.includes(keyword)
    // );
    const containsForbiddenKeyword = forbiddenKeywords.some(keyword => {
      const matches = urlString.includes(keyword);
      if (matches) console.log(`Found forbidden keyword: "${keyword}" in URL`);
      return matches;
    });
    if (containsForbiddenKeyword) {
      console.warn("URL contains forbidden keyword:", value);
      return false;
    }

    return true;

  } catch {
    console.warn("Invalid URL:", value);
    return false;
  }
}