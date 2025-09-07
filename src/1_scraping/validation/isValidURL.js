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
    
    // Split URL path into segments and then split by hyphens to get individual words
    const pathSegments = url.pathname.toLowerCase().split('/').filter(segment => segment);
    const pathWords = pathSegments.flatMap(segment => segment.split('-')).filter(word => word);
    
    // Get search parameters as string
    const searchParams = url.searchParams.toString().toLowerCase();
    
    // Check if any path word is a forbidden keyword
    const hasWordMatch = pathWords.some(word => 
      forbiddenKeywords.includes(word)
    );
    
    // Check if search parameters contain forbidden keywords
    const hasSearchParamMatch = forbiddenKeywords.some(keyword => 
      searchParams.includes(keyword)
    );
    
    if (hasWordMatch || hasSearchParamMatch) {
      console.warn("URL contains forbidden keyword:", value);
      return false;
    }
    
    return true;
    
  } catch {
    console.warn("Invalid URL:", value);
    return false;
  }
}