//https://claude.ai/chat/6fc284bd-77f8-4961-bd8e-aa5ed861453c
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

require('dotenv').config()
const fs = require('fs')
var zlib = require('zlib');
const fetch = require('node-fetch')

async function uploadCollection({ fileName, data, gitFolder, compress = true }) {

    console.log('process.env.GH_TOKEN__', process.env.GH_TOKEN)

    const fileExtension = compress ? '.json.gz' : '.json'
    const fullFileName = `${fileName}${fileExtension}`

    const responsesha = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fullFileName}`, { method: 'get', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } })

    let base64data

    if (compress) {
        await compressFile({ fileName, data })
        let buff = fs.readFileSync(`${fileName}.json.gz`);
        base64data = buff.toString('base64');
    } else {
        const jsonString = JSON.stringify(data, null, 2) // Pretty format for better readability
        base64data = Buffer.from(jsonString, 'utf8').toString('base64')
    }

    if (responsesha.ok) {

        const { sha } = await responsesha.json()

        const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fullFileName}`, { method: 'put', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" }, body: JSON.stringify({ message: 'coder content', sha, content: base64data, branch: 'main' }) })

        if (!response.ok) {
            throw response
        } else {
            const responseData = await response.json()
     
            return {
                response,
                url: responseData.content.html_url,
                downloadUrl: responseData.content.download_url
            }
        }
    }
    else {

        const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fullFileName}`, { method: 'put', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" }, body: JSON.stringify({ message: 'coder content', content: base64data, branch: 'main' }) })
        
        if (!response.ok) {
            throw response
        } else {
            const responseData = await response.json()
            return {
                response,
                url: responseData.content.html_url,
                downloadUrl: responseData.content.download_url
            }
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
            resolve(true)
        })

        w.on('error', (error) => {
            reject(error)
        })
        r.pipe(gzip).pipe(w);
    })
}

export { uploadCollection }