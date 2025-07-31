export default function getMainDomainPart(url) {
  const known2LevelTLDs = ['com.tr', 'gov.tr', 'co.uk', 'com.br', 'net.tr', 'org.tr']; // Extend as needed

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');

    const lastTwo = parts.slice(-2).join('.');
    const lastThree = parts.slice(-3).join('.');

    if (known2LevelTLDs.includes(lastTwo)) {
      return parts[parts.length - 3];
    }

    if (known2LevelTLDs.includes(lastThree)) {
      return parts[parts.length - 4];
    }

    return parts[parts.length - 2];
  } catch (e) {
    console.error("Invalid URL:", url);
    return null;
  }
}

