// --- CLEANING & PARSING COMBO ---

function parsePrice(trimPrice) {
  if (typeof trimPrice !== 'string') return 0;
  trimPrice = trimPrice.trim();

  switch (true) {
    // Turkish format: 1.111.111,11
    case /^\d{1,3}(\.\d{3})+,\d{2}$/.test(trimPrice):
      return parseFloat(trimPrice.replace(/\./g, '').replace(',', '.'));

    // US format: 1,111,111.11
    case /^\d{1,3}(,\d{3})+\.\d{2}$/.test(trimPrice):
      return parseFloat(trimPrice.replace(/,/g, ''));

    // Mixed Turkish format like 6,825.00 (should become 6825.00)
    case /^\d{1,3},\d{3}\.\d{2}$/.test(trimPrice): // e.g., 6,825.00
      return parseFloat(trimPrice.replace(',', ''));

    // Zero-prefixed decimals
    case /^0[,]\d\d$/.test(trimPrice): // 0,99
    case /^0[.]\d\d$/.test(trimPrice): // 0.99
      return parseFloat(trimPrice.replace(',', '.'));

    // Simple comma decimals
    case /^\d+[,]\d$/.test(trimPrice):
    case /^\d+[,]\d\d$/.test(trimPrice):
      return parseFloat(trimPrice.replace(',', '.'));

    // Dot decimals
    case /^\d+[.]\d$/.test(trimPrice):
    case /^\d+[.]\d\d$/.test(trimPrice):
      return parseFloat(trimPrice);

    // Comma thousand, dot decimal: 3,950.00
    case /^\d+[,]\d{3}[.]\d\d$/.test(trimPrice):
      return parseFloat(trimPrice.replace(',', ''));

    // Dot thousand, comma decimal: 14.918,00
    case /^\d{1,3}(\.\d{3})+[,]\d{2}$/.test(trimPrice):
      return parseFloat(trimPrice.replace(/\./g, '').replace(',', '.'));

    // 1.449,90
    case /^\d[.]\d{3}[,]\d{2}$/.test(trimPrice):
      return parseFloat(trimPrice.replace('.', '').replace(',', '.'));

    // Just digits
    case /^\d+$/.test(trimPrice):
      return parseFloat(trimPrice);

    default:
      return 0;
  }
}

export default function mapPrice(
  rawPrice,
  obj = {},
  {
    usdRate = 33.5,
    eurRate = 37.01,
    strictMode = false,
    returnObject = false,
  } = {}
) {
  if (rawPrice === undefined || rawPrice === null) {
    if (strictMode) throw `Price is undefined: ${JSON.stringify(obj)}`;
    return returnObject ? { value: 0, currency: null, raw: rawPrice } : 0;
  }

  // Clean known words and symbols
  const unneededWords = [
    '2 ve üzeri net %50 indirim:',
    'sepette',
    'İndirimli fiyat',
    'Normal fiyat',
    'fırsat',
    'sadece',
    'indirimli',
    'kampanya',
    'alışverişe',
    'başlayan',
    'başlayan fiyatlarla',
    'TL\'den',
    've üzeri',
    'fiyatı',
    'fiyat',
    'adet',
    '₺',
    'tl',
    'TL',
    ':',
    '\n',
  ];

  let cleaned = rawPrice.toString()
    .normalize('NFKC')
    .replace(/\u00a0/g, '') // Non-breaking space
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .trim();

  for (const word of unneededWords) {
    const regex = new RegExp(word, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  cleaned = cleaned
    .replace(/(USD|\$)/gi, '$')
    .replace(/€/g, '€')
    .replace(/(TL|₺)/gi, '')
    .replace(/\s+/g, '') // remove remaining spaces
    .trim();

  // Currency detection
  let currency = 'TRY';
  if (cleaned.includes('$')) {
    currency = 'USD';
    cleaned = cleaned.replace(/\$/g, '');
  } else if (cleaned.includes('€')) {
    currency = 'EUR';
    cleaned = cleaned.replace(/€/g, '');
  }

  // ✅ Fix mixed format before parsing
  if (/^\d{1,3},\d{3}\.\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '');
  }

  const numeric = parsePrice(cleaned);

  if (numeric === 0 && strictMode) {
    throw `Unparsable price "${rawPrice}" in: ${JSON.stringify(obj)}`;
  }

  let converted = numeric;
  if (currency === 'USD') {
    converted = parseFloat((numeric * usdRate).toFixed(2));
  } else if (currency === 'EUR') {
    converted = parseFloat((numeric * eurRate).toFixed(2));
  }

  return returnObject
    ? { value: converted, currency, raw: rawPrice }
    : converted;
}
