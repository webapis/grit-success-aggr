export default async function generateSHA256FromPrimaryImg(primaryImg) {
  if (typeof primaryImg !== 'string' || primaryImg.trim() === '') {
    console.warn('Invalid or missing primaryImg');
    return null;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(primaryImg.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
