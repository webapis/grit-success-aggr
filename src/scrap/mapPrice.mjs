function parsePrice(trimPrice) {
  switch (true) {
    case /^\d\d\d[,]\d\d$/.test(trimPrice): // 299,99
    case /^\d\d\d[,]\d$/.test(trimPrice): // 299,9
      return parseFloat(trimPrice.replace(',', '.'));

    case /^\d\d\d[.]\d$/.test(trimPrice): // 299.9
    case /^\d\d\d[.]\d\d$/.test(trimPrice): // 299.99
    case /^\d\d\d\d[.]\d\d$/.test(trimPrice): // 1499.99
    case /^\d\d\d\d\d[.]\d\d$/.test(trimPrice): // 12999.95
      return parseFloat(trimPrice);

    case /^\d\d\d[.]\d\d\d$/.test(trimPrice): // 106.950
    case /^\d\d[.]\d\d\d$/.test(trimPrice): // 10.950
    case /^\d[.]\d\d\d$/.test(trimPrice): // 1.950
      return parseFloat(trimPrice.replace('.', ''));

    case /^\d[.]\d\d$/.test(trimPrice): // 5.96
    case /^\d\d\d\d[.]\d$/.test(trimPrice): // 1499.9
      return parseFloat(trimPrice);

    case /^\d\d\d\d[,]\d$/.test(trimPrice): // 1499,9
    case /^\d\d\d\d[,]\d\d$/.test(trimPrice): // 1499,99
      return parseFloat(trimPrice.replace(',', '.'));

    case /^\d[.]\d\d\d[,]\d\d$/.test(trimPrice): // 1.449,90
      return parseFloat(trimPrice.replace('.', '').replace(',', '.'));

    case /^\d[.]\d\d\d$/.test(trimPrice): // 1.449
      return parseFloat(trimPrice.replace('.', ''));

    case /^\d[,]\d\d\d$/.test(trimPrice): // 9,500
      return parseFloat(trimPrice.replace(',', ''));

    case /^\d\d\d\d$/.test(trimPrice): // 4299
      return parseFloat(trimPrice);

    case /^\d[,]\d\d\d[.]\d\d$/.test(trimPrice): // 3,950.00
    case /^\d\d[,]\d\d\d[.]\d\d$/.test(trimPrice): // 34,950.00
      return parseFloat(trimPrice.replace(',', ''));

    case /^\d\d\d$/.test(trimPrice): // 999
    case /^\d\d$/.test(trimPrice): // 99
      return parseFloat(trimPrice);

    case /^\d\d[,]\d\d$/.test(trimPrice): // 81,00
      return parseFloat(trimPrice.replace(',', '.'));

    case /^\d\d[.]\d\d$/.test(trimPrice): // 81.00
    case /^\d\d[.]\d$/.test(trimPrice): // 99.9
      return parseFloat(trimPrice);

    case /^\d\d[,]\d$/.test(trimPrice): // 99,9
      return parseFloat(trimPrice.replace(',', '.'));

    case /^\d\d[.]\d\d\d[,]\d\d$/.test(trimPrice): // 14.918,00
    case /^\d\d\d[.]\d\d\d[,]\d\d$/.test(trimPrice): // 111.345,48
      return parseFloat(trimPrice.replace(/\./g, '').replace(',', '.'));

    case /^\d\d\d\d\d$/.test(trimPrice): // 11499
      return parseFloat(trimPrice);

    case /^\d\d[.]\d\d\d$/.test(trimPrice): // 14.918
      return parseFloat(trimPrice.replace('.', ''));

    case /^\d\d[,]\d\d\d$/.test(trimPrice): // 14,918
      return parseFloat(trimPrice.replace(',', ''));

    default:
      return 0;
  }
}

export default function mapPrice(rawPrice, obj = {}, {
  usdRate = 33.5,
  eurRate = 37.01,
  strictMode = false,
  returnObject = false
} = {}) {
  if (rawPrice === undefined || rawPrice === null) {
    if (strictMode) throw `Price is undefined: ${JSON.stringify(obj)}`;
    return returnObject ? { value: 0, currency: null, raw: rawPrice } : 0;
  }

  // Clean known prefixes/suffixes (case-insensitive)
  const unneededWords = [
    'sepette', 'fırsat', 'sadece', 'indirimli', 'kampanya',
    'alışverişe', 'başlayan', 'başlayan fiyatlarla', 'tl\'den', 've üzeri',
    'başlayan', 'fiyatı', 'fiyat', 'sadece', 'adet', '₺', 'tl', 'tl', ':'
  ];

  let cleaned = rawPrice.toString()
    .normalize('NFKC') // Normalize unicode
    .replace(/\u00a0/g, '') // non-breaking space
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();

  for (const word of unneededWords) {
    const regex = new RegExp(word, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  cleaned = cleaned
    .replace(/(USD|\$)/gi, '$')
    .replace(/€/g, '€')
    .replace(/(TL|tl|₺)/g, '') // final clean of TL symbol
    .replace(/\s+/g, '') // remove remaining spaces
    .trim();

  let currency = 'TRY';

  if (cleaned.includes('$')) {
    currency = 'USD';
    cleaned = cleaned.replace('$', '');
  } else if (cleaned.includes('€')) {
    currency = 'EUR';
    cleaned = cleaned.replace('€', '');
  }

  const numeric = parsePrice(cleaned);

  if (numeric === 0 && strictMode) {
    throw `Unparsable price "${rawPrice}" in: ${JSON.stringify(obj)}`;
  }

  let convertedValue = numeric;
  if (currency === 'USD') {
    convertedValue = parseFloat((numeric * usdRate).toFixed(2));
  } else if (currency === 'EUR') {
    convertedValue = parseFloat((numeric * eurRate).toFixed(2));
  }

  return returnObject
    ? { value: convertedValue, currency, raw: rawPrice }
    : convertedValue;
}
