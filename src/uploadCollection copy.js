import { walkSync } from './walkSync.js'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

require('dotenv').config()
const fs = require('fs')
var zlib = require('zlib');
const fetch = require('node-fetch')
const makeDir = require('make-dir')
const path = require('path')

//gender is folder name
//marka is file name

async function uploadCollection({ fileName, data, gender, marka }) {
    console.log('process.env.GH_TOKEN__', process.env.GH_TOKEN)
    const responsesha = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gender}/${fileName}.json.gz`, { method: 'get', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } })
debugger

    if (responsesha.ok) {
     
        const { sha } = await responsesha.json()
        await makeDir(`zipped-files/${marka}`)
        await getSingleContent(`${gender}/${marka}.json.gz`)
        await unzipSingleContent(`single-content/${gender}/${marka}.json.gz`)
  //      const prevDataRaw = fs.readFileSync(`single-content/${gender}/${marka}.json`, { encoding: 'utf8' })
    //    const prevData = JSON.parse(prevDataRaw)
   //     const updatedData = mergePrevData({ gender, marka, data, prevData })
        await compressFile({ fileName, data, gender })
        let buff = fs.readFileSync(`${fileName}.json.gz`);
        let base64data = buff.toString('base64');

        const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gender}/${fileName}.json.gz`, { method: 'put', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" }, body: JSON.stringify({ message: 'coder content', sha, content: base64data, branch: 'main' }) })

        if (!response.ok) {

            throw response
        }
    }
    else {
        debugger
        await compressFile({ fileName, data, gender })
        debugger
        let buff = fs.readFileSync(`${fileName}.json.gz`);
        let base64data = buff.toString('base64');
        const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gender}/${fileName}.json.gz`, { method: 'put', headers: { Accept: "application/vnd.github.v3+json", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" }, body: JSON.stringify({ message: 'coder content', content: base64data, branch: 'main' }) })
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

async function downloadCollection() {

    const gender = process.env.GENDER
    console.log('gender', gender)

    await getZipFiles(gender)

    await unzipFiles(gender)
}


async function unzipFiles(gender) {

    const promises = []
    try {
        walkSync(path.join(process.cwd(), `/zipped-files`), async (filepath) => {

            promises.push(filepath)

        })
        console.log('uzip file length', promises.length)
        for (let a of promises) {

            await unzipSingleFile(a)
        }

    } catch (error) {

    }


}

async function unzipSingleFile(zippedfilePath) {

    const unzippedFilePath = zippedfilePath.replace('zipped-files', 'unzipped-data').replace('.gz', '')
    const folderPath = path.dirname(unzippedFilePath)
    await makeDir(folderPath)

    const fileContents = fs.createReadStream(zippedfilePath);
    const writeStream = fs.createWriteStream(unzippedFilePath);
    const unzip = zlib.createGunzip();

    return new Promise((resolve, reject) => {
        writeStream.on('close', () => {
            console.log('unzip complete')
            resolve(true)
        })
        writeStream.on('error', (error) => {
            console.log('unzip error', error)
            reject(error)
        })
        fileContents.pipe(unzip).pipe(writeStream);
    })

}

async function getZipFiles(gender) {
    // Retrieve source code for project
    //Retrieved source code will be copied to project branch of forked agregators repo
    //---- List branches endpoint----
    /*required for the next endoint*/
    const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/branches`, { method: 'get', headers: { Accept: "application/vnd.github.raw", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } })
    const data = await response.json()

    const mainSha = data.find(d => d.name === 'main')
    const { commit: { sha } } = mainSha

    //------Git database / Get a tree endpoint------
    /*required to retrieve list of file and folder into*/
    const treeResponse = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/git/trees/${sha}?recursive=1`, { method: 'get', headers: { Accept: "application/vnd.github.raw", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } })
    const treeData = await treeResponse.json()
    const { tree } = treeData
        ;
    const dataFolderTrees = tree.filter(f => f.type === 'blob' && f.path.includes(`${gender}/`))


    for (let t of dataFolderTrees) {
        await getContent(t.path)
    }
}

async function getContent(filepath) {
    const fileName = path.basename(filepath)

    await makeDir('zipped-files')
    const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${filepath}`, { method: 'get', headers: { Accept: "application/vnd.github.raw", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } })

    var file = fs.createWriteStream(`zipped-files/${fileName}`);

    //     const data = await response.json()

    //     const content = data.content
    // 
    //     let buff = new Buffer(content, 'base64');

    //     let text = buff.toString('utf-8');

    return new Promise((resolve, reject) => {
        response.body.on('close', () => {
            console.log('fetched')
            resolve()

        })
        response.body.on('error', (error) => {
            reject(error)

        })

        response.body.pipe(file)
    })

}

async function getSingleContent(filepath) {
    const folderPath = path.dirname(filepath)


    makeDir.sync('single-content/' + folderPath)

    const response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${filepath}`, { method: 'get', headers: { Accept: "application/vnd.github.raw", authorization: `token ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } })

    var file = fs.createWriteStream('single-content/' + filepath);

    //     const data = await response.json()

    //     const content = data.content
    // 
    //     let buff = new Buffer(content, 'base64');

    //     let text = buff.toString('utf-8');

    return new Promise((resolve, reject) => {
        response.body.on('close', () => {
            console.log('fetched')
            resolve()

        })
        response.body.on('error', (error) => {
            reject(error)

        })

        response.body.pipe(file)
    })

}

async function unzipSingleContent(zippedfilePath) {

    const unzippedFilePath = zippedfilePath.replace('.gz', '')
    const folderPath = path.dirname(unzippedFilePath)
    await makeDir(folderPath)

    const fileContents = fs.createReadStream(zippedfilePath);
    const writeStream = fs.createWriteStream(unzippedFilePath);
    const unzip = zlib.createGunzip();

    return new Promise((resolve, reject) => {
        writeStream.on('close', () => {
            console.log('unzip complete')
            resolve(true)
        })
        writeStream.on('error', (error) => {
            console.log('unzip error', error)
            reject(error)
        })
        fileContents.pipe(unzip).pipe(writeStream);
    })

}

function mergePrevAndNewData({ gender, marka, data, prevData }) {

    // const prevDataRaw = fs.readFileSync(`single-content/${gender}/${marka}.json`, { encoding: 'utf8' })
    // const prevData = JSON.parse(prevDataRaw)

    let mergedData = []
    if (prevData.length >= data.length) {
        mergedData = prevData.map((p) => {
            const matchC = data.find(c => c.imageUrl === p.imageUrl)
            delete matchC.timestamp
            const prevData = p
            delete prevData.timestamp
            if (matchC) {

                if (deepEqual(matchC, prevData)) {

                    return {
                        ...matchC, update: false
                    }
                } else {

                    return { ...matchC, update: true }

                }
            } else {
                return { ...p, update: true }
            }
        })
        return mergedData
    } else {
        mergedData = data.map((c) => {
            const matchP = prevData.find(f => f.imageUrl === c.imageUrl)
            const currentData = c
            delete currentData.timestamp
            if (matchP) {
                const prevData = matchP
                if (deepEqual(prevData, currentData)) {

                    return {
                        ...c, update: false
                    }
                } else {

                    return { ...c, update: true }

                }
            } else {
                return { ...c, update: true }
            }
        })
        return mergedData
    }


}

export  { uploadCollection, downloadCollection, getSingleContent, unzipSingleContent, mergePrevAndNewData }