 function deaccent(str) {
    var accents = {
      'ı': 'i',
      'á': 'a',
      'â': 'a',
      'ã': 'a',
      'ä': 'a',
      'ç': 'c',
      'ç':'c',
      'Ö': 'o',
      'Ü': 'u',
      'I': 'i',
      'İ': 'i',
      'Ç': 'c',
      'è': 'e',
      'é': 'e',
      'ê': 'e',
      'ë': 'e',
      'ì': 'i',
      'í': 'i',
      'î': 'i',
      'ï': 'i',
      'ñ': 'n',
      'ò': 'o',
      'ó': 'o',
      'ô': 'o',
      'õ': 'o',
      'ö': 'o',
      'ß': 's',
      'ù': 'u',
      'ú': 'u',
      'û': 'u',
      'ü': 'u',
      'ÿ': 'y',
      'Ş':'s',
      'ş':'s',
      'ğ':'g',
      'Ğ':'g'
    };
  
    var newStr = '';
    for (var i = 0; i < str.length; i++) {
      var char = str[i];
      if (accents[char]) {
        newStr += accents[char];
      } else {
        newStr += char;
      }
    }
  
    return newStr;
  }
  

export default deaccent