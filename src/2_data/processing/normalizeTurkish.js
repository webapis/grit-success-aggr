export default function normalizeTurkish(text) {
  // Convert to lowercase
  text = text.toLowerCase();

  // Replace Turkish characters with their ASCII equivalents
  const turkishChars = {
    ı: "i",
    ğ: "g",
    ü: "u",
    ş: "s",
    ö: "o",
    ç: "c",
    İ: "i",
    Ğ: "g",
    Ü: "u",
    Ş: "s",
    Ö: "o",
    Ç: "c",
  };

  text = text.replace(/[ıİğĞüÜşŞöÖçÇ]/g, (char) => turkishChars[char] || char);

  // Remove diacritical marks
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
