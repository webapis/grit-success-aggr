// Remove duplicates from commonBagWords
const commonBagWords = ['çantası', 'çanta', 'bag', 'çantasi'];

export default [
    {
        includesOr: commonBagWords,
        includesOrExact: true,
        keyword: 'çanta'
    },

    {
        includesOrConditions: [['omuz', 'shoulder', 'kol'], commonBagWords],

        keyword: 'omuz çantası'
    },
    {
        includesOrConditions: [['çapraz', 'çaprazı', 'crossbody', 'cross body', 'cross-body'], commonBagWords],
        keyword: 'çapraz çanta'
    },
    {
        includesAll: ['cross', 'bag'],
        keyword: 'çapraz çanta'
    },
    {
        includesAll: ['cross body', 'bag'],
        keyword: 'çapraz çanta'
    },
    {
        includesAll: ['sırt'],
        includesOr: commonBagWords,
        keyword: 'sırt çantası'
    },
    {
        includesAll: ['baget'],
        includesOr: commonBagWords,
        keyword: 'baget çanta'
    },
    {
        includesOrConditions: [['plaj', 'beach'], commonBagWords],
        keyword: 'plaj çantası'
    },
    {
        includesAll: ['el'],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'el çantası'
    },
    {
        includesAll: ['Handbag'],
        includesAllExact: true,
        keyword: 'el çantası'
    },
    {
        includesAll: ['tablet'],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'tablet çantası'
    },
    {
        includesAll: ['telefon'],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'telefon çantası'
    },
    {
        includesOrConditions: [['baskılı', 'baskili', 'baskı'], commonBagWords],
        keyword: 'baskılı çanta'
    },
    {
        includesAll: ['büyük'],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'büyük çanta'
    },
    {
        includesAll: ['zincirli', 'zincir'],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'zincirli çanta'
    },
    {
        includesOrConditions: [['Leather', 'leather', 'deri'], commonBagWords],
        keyword: 'deri çanta'
    },
    {
        includesAll: ['suni', 'deri'],
        includesOr: commonBagWords,
        keyword: 'suni deri çanta'
    },
    {
        includesOrConditions: [['hasır', 'hasir'], commonBagWords],
        keyword: 'hasır çanta'
    },
    {
        includesAll: ['küçük çanta'],
        keyword: 'küçük çanta'
    },
    {
        includesAll: ['Metal Aksesuarlı'],
        keyword: 'metal aksesuarlı çanta'
    },
    {
        includesAll: ["tote"],
        includesOr: commonBagWords,
        keyword: 'tote çanta'
    },
    {
        includesAll: ["clutch"],
        keyword: 'debriyaj çanta'
    },
    {
        includesAll: ["cloth Bag"],
        keyword: 'bez çanta'
    },
    {
        includesAll: ["Postacı"],
        includesOr: commonBagWords,
        keyword: 'postacı çantası'
    },
    {
        includesAll: ["Portföy"],
        keyword: 'portföy'
    },
    {
        includesAll: ["gece"],
        includesOr: commonBagWords,
        keyword: 'gece çantası'
    },
    {
        includesAll: ["makyaj"],
        includesOr: commonBagWords,
        keyword: 'makyaj çantası'
    },
    {
        includesAll: ["airpods"],
        includesOr: ['kılıfı'],
        keyword: 'airpods kılıfı'
    },
    {
        includesAll: ["kese"],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'kese çanta'
    },
    {
        includesAll: ["bel"],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'bel çantası'
    },
    {
        includesAll: ["Zincir Askılı"],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'zincir askılı çanta'
    },
    {
        includesAll: ["su geçirmez"],
        includesAllExact: true,
        includesOr: commonBagWords,
        keyword: 'su geçirmez çanta'
    },
    {
        includesAll: ["leopar", "desen"],
        includesOr: commonBagWords,
        keyword: 'leopar desenli çanta'
    },
    {
        includesAll: ["okul"],
        includesOr: commonBagWords,
        keyword: 'okul çantası'
    },
    {
        includesAll: ["Sedef", "görünümlü"],
        includesOr: commonBagWords,
        keyword: 'Sedef görümümlü çantası'
    },
    {
        includesAll: ["jean", "görünümlü"],
        includesOr: commonBagWords,
        keyword: 'jean görümümlü çantası'
    },
    {
        includesAll: ["Yılan Derisi Desenli"],
        includesOr: commonBagWords,
        keyword: 'yılan derisi desenli çanta'
    },
    {
        includesAll: ["Pelüş"],
        includesOr: commonBagWords,
        keyword: 'Pelüş çanta'
    },
    {
        includesAll: ["düz"],
        includesOr: commonBagWords,
        keyword: 'Düz çanta'
    },
    {
        includesAll: ["Toka Detaylı"],
        includesOr: commonBagWords,
        keyword: 'toka detaylı çanta'
    },
    {
        includesAll: ["süet"],
        includesOr: commonBagWords,
        keyword: 'süet çanta'
    },
    {
        includesAll: ["fermuar", "detaylı"],
        includesOr: commonBagWords,
        keyword: 'fermuar detaylı çanta'
    },
    {
        includesAll: ["Ananas"],
        includesOr: commonBagWords,
        keyword: 'ananas desenli çanta'
    },
    {
        includesAll: ["zımba"],
        includesOr: commonBagWords,
        keyword: 'zımba detaylı çanta'
    },
    {
        includesAll: ["alışveriş"],
        includesOr: commonBagWords,
        keyword: 'alışveriş çantası'
    },
    {
        includesAll: ["shopper"],
        includesOr: commonBagWords,
        keyword: 'alışveriş çantası'
    },
    {
        includesAll: ["ruj"],
        includesOr: commonBagWords,
        keyword: 'ruj çantası'
    },
    {
        includesAll: ["Hilal"],
        includesOr: commonBagWords,
        keyword: 'Hilal şeklinde çantası'
    },
    {
        includesAll: ["orta boy"],
        includesOr: commonBagWords,
        keyword: 'orta boy çanta'
    },
    {
        includesAll: ["klasik"],
        includesOr: commonBagWords,
        keyword: 'klasik çanta'
    },
    {
        includesAll: ["mini"],
        includesOr: commonBagWords,
        keyword: 'mini çanta'
    },
    {
        includesAll: ["vegan"],
        includesOr: commonBagWords,
        keyword: 'vegan çanta'
    },
    {
        includesAll: ["abiye"],
        includesOr: commonBagWords,
        keyword: 'abiye çanta'
    },
    {
        includesAll: ["ağzı büzgülü"],
        includesOr: commonBagWords,
        keyword: 'ağzı büzgülü çanta'
    },
    {
        includesAll: ["akıllı"],
        includesOr: commonBagWords,
        keyword: 'akıllı çanta'
    },
    {
        includesAll: ["All-in"],
        includesOr: commonBagWords,
        keyword: 'All-in çanta'
    },
    {
        includesAll: ["carry all"],
        includesOr: commonBagWords,
        keyword: 'carry all çanta'
    },
    {
        includesAll: [" ALL DAY"],
        includesOr: commonBagWords,
        keyword: ' ALL DAY çanta'
    },
    {
        includesAll: ['anne', 'bebek'],
        includesOr: commonBagWords,
        keyword: 'anne-bebek çantası',
    },
    {
        includesAll: ['anti', 'theft'],
        includesOr: commonBagWords,
        keyword: 'hırsızlığa karşı anti-theft çantası',
    },
    {
        includesOrConditions: [['askılı', 'askili'], commonBagWords],
        keyword: 'askılı çanta',
    },
    {
        includesOrConditions: [['Askı', 'detaylı'], commonBagWords],
        keyword: 'askı detaylı çanta',
    },
    {
        includesOrConditions: [['astarlı'], commonBagWords],
        keyword: 'astarlı çanta',
    },
    ,
    {
        includesOrConditions: [['floater', 'deri'], commonBagWords],
        keyword: 'floater deri çanta',
    }
    ,
    {
        includesOrConditions: [['kumaş'], commonBagWords],
        keyword: 'kumaş çanta',
    }
    ,
    {
        includesOrConditions: [['evrak'], commonBagWords],
        keyword: 'evrak çantası',
    }
    ,
    {
        includesOrConditions: [['kalem'], commonBagWords],
        keyword: 'kalem çantası',
    }
    ,
    {
        includesOrConditions: [['spor'], commonBagWords],
        keyword: 'spor çantası',
    },

    {
        includesOrConditions: [['saffiano', 'deri'], commonBagWords],
        keyword: 'saffiano deri çantası',
    }
    ,

    {
        includesOrConditions: [['logolu'], commonBagWords],
        keyword: 'logolu çanta',
    }
];