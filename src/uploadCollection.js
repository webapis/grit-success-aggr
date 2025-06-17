
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

require('dotenv').config()
const fs = require('fs')
var zlib = require('zlib');
const fetch = require('node-fetch')



async function uploadCollection({ fileName, data, gitFolder }) {
  debugger
    console.log('process.env.GH_TOKEN__', process.env.GH_TOKEN)

    const responsesha = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fileName}.json.gz`, { method: 'get', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } })
  
    await compressFile({ fileName, data })

    let buff = fs.readFileSync(`${fileName}.json.gz`);
    let base64data = buff.toString('base64');
  
    if (responsesha.ok) {

        const { sha } = await responsesha.json()
        
        const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fileName}.json.gz`, { method: 'put', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" }, body: JSON.stringify({ message: 'coder content', sha, content: base64data, branch: 'main' }) })
        
        if (!response.ok) {

            throw response
        }
    }
    else {

        const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fileName}.json.gz`, { method: 'put', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" }, body: JSON.stringify({ message: 'coder content', content: base64data, branch: 'main' }) })
        debugger
        if (!response.ok) {
            throw response
        }
    }

}

async function compressFile({ fileName, data }) {
    fs.writeFileSync(`${fileName}.json`, JSON.stringify(data))

    return new Promise((resolve, reject) => {
        var gzip = zlib.createGzip();
        var r = fs.createReadStream(`${fileName}.json`);
        var w = fs.createWriteStream(`${fileName}.json.gz`);

        w.on('close', () => {
            debugger
            resolve(true)
        })

        w.on('error', (error) => {
            reject(error)
        })
        r.pipe(gzip).pipe(w);

    })

}











export { uploadCollection }