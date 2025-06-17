import fs from 'fs'
import atv from '../data/atv.json'  with { type: "json" }
import kanal7 from '../data/kanal7.json'  with { type: "json" }
import kanald from '../data/kanald.json'  with { type: "json" }
import nowtv from '../data/nowtv.json'  with { type: "json" }
import showtv from '../data/showtv.json'  with { type: "json" }
import startv from '../data/startv.json'  with { type: "json" }
import trt1 from '../data/trt1.json'  with { type: "json" }
import medyapim from '../data/medyapim.json'  with { type: "json" }
import wikidl from '../data/wikidl.json'  with { type: "json" }
import deaccent from './deaccent.js'
import groupBy from './groupBy.js'
const initData = [...atv, ...kanal7, ...kanald, ...nowtv, ...showtv, ...startv, ...trt1,...medyapim]
const notFound = []
const mappedData = initData.map(m => {
    const title = deaccent(m.dizi.title).toLocaleLowerCase()

    const result = wikidl.find(f => deaccent(f.dizi.title).toLocaleLowerCase().includes(title) || title.includes(f.dizi.title) )

    if (result) {

        return { dizibilgiler: result.bilgiler, diziWikiRef: result.dizi.detailHref, ...m, title: result.dizi.title }
    } else {
        notFound.push(m)

        return { ...m, title: m.dizi.title }

    }


})

const groupedByTitle = Object.entries(groupBy(mappedData, "title"))
fs.writeFileSync(`${process.cwd()}/data/aggregated-data/tvseries.json`,JSON.stringify(groupedByTitle))
fs.writeFileSync(`${process.cwd()}/data/aggregated-data/tvseries-uncomlete.json`,JSON.stringify({notFound}))
debugger


