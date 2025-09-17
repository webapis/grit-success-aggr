export default [
    {
        includesOr: ['çantası', 'çanta'],
        keyword: 'çanta'
    },
    {
        includesAll: ['çantası', 'omuz'],
        keyword: 'omuz çantası'
    },
    {
        includesAll: ['shoulder bag'],
        keyword: 'omuz çantası'
    },
    {
        includesAll: ['çapraz'],
        includesOr: ['çanta', 'çantası'],
        keyword: 'çapraz çanta'
    },
    {
        includesAll: ['crossbody', 'bag'],
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
        includesOr: ['çanta', 'çantası'],
        keyword: 'sırt çantası'
    },
    {
        includesAll: ['baget'],
        includesOr: ['çanta', 'çantası'],
        keyword: 'baget çanta'
    },
    {
        includesAll: ['plaj'],
        includesOr: ['çanta', 'çantası'],
        keyword: 'plaj çantası'
    },
    {
        includesAll: ['el'],
        includesAllExact: true,
        includesOr: ['çanta', 'çantası'],
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
        includesOr: ['çanta', 'çantası'],
        keyword: 'tablet çantası'
    },
    {
        includesAll: ['telefon'],
        includesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'telefon çantası'
    },
    {
        includesAll: ['baskılı'],
        includesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'baskılı çanta'
    },
    {
        includesAll: ['büyük'],
        includesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'büyük çanta'
    },
    {
        includesAll: ['zincirli', 'zincir'],
        includesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'zincirli çanta'
    },
    {
        includesAll: ['Leather'],
        includesOr: ['bag'],
        keyword: 'deri çanta'
    },
    {
        includesAll: ['deri'],
        excludes: ['suni', 'sahte', 'yapay'],
        includesOr: ['çanta', 'çantası'],
        keyword: 'deri çanta'
    },
    {
        includesAll: ['suni', 'deri'],
        includesOr: ['çanta', 'çantası'],
        keyword: 'suni deri çanta'
    },
    {
        includesAll: ['hasır'],
        includesOr: ['çanta', 'çantası'],
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
        includesOr: ['çanta', 'çantası', 'bag'],
        keyword: 'tote çanta'
    }
    ,
    {
        includesAll: ["clutch"],
        keyword: 'debriyaj çanta'
    }
    ,
    {
        includesAll: ["cloth Bag"],
        keyword: 'bez çanta'
    }
    ,
    {
        includesAll: ["Postacı"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'postacı çantası'
    }
    ,
    {
        includesAll: ["Portföy"],
        keyword: 'portföy'
    }
    ,
    {
        includesAll: ["gece"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'gece çantası'
    }
    ,
    {
        includesAll: ["makyaj"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'makyaj çantası'
    }

    ,
    {
        includesAll: ["airpods"],
        includesOr: ['kılıfı'],
        keyword: 'airpods kılıfı'
    }
    ,
    {
        includesAll: ["kese"],
        matchesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'kese çanta'
    }
    ,
    {
        includesAll: ["bel"],
        matchesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'bel çantası'
    }
    ,
    {
        includesAll: ["Zincir Askılı"],
        matchesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'zincir askılı çanta'
    },

    {
        includesAll: ["su geçirmez"],
        matchesAllExact: true,
        includesOr: ['çanta', 'çantası'],
        keyword: 'su geçirmez çanta'
    },

    {
        includesAll: ["leopar", "desen"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'leopar desenli çanta'
    }
    ,

    {
        includesAll: ["okul"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'okul çantası'
    },

    {
        includesAll: ["Sedef", "görünümlü"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'Sedef görümümlü çantası'
    },

    {
        includesAll: ["jean", "görünümlü"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'jean görümümlü çantası'
    }
    ,

    {
        includesAll: ["Yılan Derisi Desenli"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'yılan derisi desenli çanta'
    },


    {
        includesAll: ["Pelüş"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'Pelüş çanta'
    },

    {
        includesAll: ["düz"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'Düz çanta'
    }
    ,

    {
        includesAll: ["Toka Detaylı"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'toka detaylı çanta'
    }
    ,

    {
        includesAll: ["süet"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'süet çanta'
    }
    ,

    {
        includesAll: ["fermuar", "detaylı"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'fermuar detaylı çanta'
    }
    ,

    {
        includesAll: ["Ananas"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'ananas desenli çanta'
    }
    ,

    {
        includesAll: ["zımba"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'zımba detaylı çanta'
    },


    {
        includesAll: ["alışveriş"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'alışveriş çantası'
    },
    {
        includesAll: ["shopper"],
        includesOr: ['çanta', 'çantası', 'bag'],
        keyword: 'alışveriş çantası'
    },

    {
        includesAll: ["ruj"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'ruj çantası'
    }
    ,

    {
        includesAll: ["Hilal"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'Hilal şeklinde çantası'
    },

    {
        includesAll: ["orta boy"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'orta boy çanta'
    },

    {
        includesAll: ["klasik"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'klasik çanta'
    }
    ,

    {
        includesAll: ["mini"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'mini çanta'
    } ,

    {
        includesAll: ["vegan"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'vegan çanta'
    } ,

    {
        includesAll: ["abiye"],
        includesOr: ['çanta', 'çantası'],
        keyword: 'abiye çanta'
    }
];

