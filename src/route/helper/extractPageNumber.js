export default function extractPageNumber(url, pageParam) {
    try {
        const urlObj = new URL(url);
        
        // Normalize parameter (strip ? or = if given)
        const cleanParam = pageParam.replace(/^\?/, '').replace(/=$/, '').replace(/\/$/, '');
        
        // Path-based parameter (like "page/")
        if (pageParam.includes('/')) {
            const escapedParam = pageParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pathPattern = new RegExp(`${escapedParam}(\\d+)`, 'i');
            const match = url.match(pathPattern);
            return match ? parseInt(match[1], 10) : null;
        }

        // Query parameter
        const pageNumber = urlObj.searchParams.get(cleanParam);
        if (pageNumber) {
            const parsed = parseInt(pageNumber, 10);
            return isNaN(parsed) ? null : parsed;
        }

        // Fallback regex
        const regexPattern = new RegExp(`[?&]${cleanParam}=([^&]+)`, 'i');
        const match = url.match(regexPattern);
        if (match) {
            const parsed = parseInt(match[1], 10);
            return isNaN(parsed) ? null : parsed;
        }

        return null;
    } catch (error) {
        console.error('Error extracting page number:', error);
        return null;
    }
}
