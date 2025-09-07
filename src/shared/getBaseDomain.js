export default function getBaseDomain(url) {
    // Remove protocol and www if present
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');

    // Remove path, query parameters, and hash
    domain = domain.split('/')[0].split('?')[0].split('#')[0];

    // Split the remaining string by dots
    const parts = domain.split('.');

    // Remove known top-level domains and country codes
    while (parts.length > 1 && (parts[parts.length - 1].length <= 3 || parts[parts.length - 1] === 'com')) {
        parts.pop();
    }

    // Return the last remaining part
    return parts[parts.length - 1];
}