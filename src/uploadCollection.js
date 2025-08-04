import { createRequire } from 'module';
const require = createRequire(import.meta.url);

require('dotenv').config()
const fs = require('fs')
var zlib = require('zlib');
const fetch = require('node-fetch')

async function uploadCollection({ fileName, data, gitFolder, compress = true, maxRetries = 3 }) {

    console.log('process.env.GH_TOKEN__', process.env.GH_TOKEN)

    const fileExtension = compress ? '.json.gz' : '.json'
    const fullFileName = `${fileName}${fileExtension}`

    let base64data

    if (compress) {
        await compressFile({ fileName, data })
        let buff = fs.readFileSync(`${fileName}.json.gz`);
        base64data = buff.toString('base64');
    } else {
        const jsonString = JSON.stringify(data, null, 2) // Pretty format for better readability
        base64data = Buffer.from(jsonString, 'utf8').toString('base64')
    }

    // Retry logic for handling conflicts
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to upload ${fullFileName}`)
            
            // Get current file info (including SHA)
            const responsesha = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fullFileName}`, { 
                method: 'get', 
                headers: { 
                    Accept: "application/vnd.github.v3+json", 
                    authorization: `token ${process.env.GH_TOKEN}`, 
                    "X-GitHub-Api-Version": "2022-11-28" 
                } 
            })

            let response;

            if (responsesha.ok) {
                // File exists, need to update with SHA
                const { sha } = await responsesha.json()
                console.log(`File exists, updating with SHA: ${sha}`)

                response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fullFileName}`, { 
                    method: 'put', 
                    headers: { 
                        Accept: "application/vnd.github.v3+json", 
                        authorization: `token ${process.env.GH_TOKEN}`, 
                        "X-GitHub-Api-Version": "2022-11-28" 
                    }, 
                    body: JSON.stringify({ 
                        message: `Update ${fullFileName} - attempt ${attempt}`, 
                        sha, 
                        content: base64data, 
                        branch: 'main' 
                    }) 
                })
            } else if (responsesha.status === 404) {
                // File doesn't exist, create new
                console.log(`File doesn't exist, creating new file`)
                
                response = await fetch(`https://api.github.com/repos/webapis/crawler-state-2/contents/${gitFolder}/${fullFileName}`, { 
                    method: 'put', 
                    headers: { 
                        Accept: "application/vnd.github.v3+json", 
                        authorization: `token ${process.env.GH_TOKEN}`, 
                        "X-GitHub-Api-Version": "2022-11-28" 
                    }, 
                    body: JSON.stringify({ 
                        message: `Create ${fullFileName} - attempt ${attempt}`, 
                        content: base64data, 
                        branch: 'main' 
                    }) 
                })
            } else {
                // Some other error occurred when fetching file info
                throw new Error(`Failed to fetch file info: ${responsesha.status} ${responsesha.statusText}`)
            }

            if (response.ok) {
                // Success!
                const responseData = await response.json()
                console.log(`✅ Successfully uploaded ${fullFileName} on attempt ${attempt}`)
                
                // Clean up temporary files if compression was used
                if (compress) {
                    try {
                        fs.unlinkSync(`${fileName}.json`)
                        fs.unlinkSync(`${fileName}.json.gz`)
                    } catch (cleanupError) {
                        console.warn('Failed to clean up temporary files:', cleanupError.message)
                    }
                }
                
                return {
                    response,
                    url: responseData.content.html_url,
                    downloadUrl: responseData.content.download_url
                }
            } else if (response.status === 409 && attempt < maxRetries) {
                // Conflict - file was updated by someone else, retry
                console.warn(`⚠️ Conflict detected on attempt ${attempt}. Retrying...`)
                const errorBody = await response.text()
                console.warn(`Conflict details: ${errorBody}`)
                
                // Wait a bit before retrying to reduce chance of another conflict
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
                continue
            } else {
                // Other error or max retries reached
                const errorBody = await response.text()
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorBody}`)
            }

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message)
            
            if (attempt === maxRetries) {
                // Clean up temporary files before throwing
                if (compress) {
                    try {
                        fs.unlinkSync(`${fileName}.json`)
                        fs.unlinkSync(`${fileName}.json.gz`)
                    } catch (cleanupError) {
                        console.warn('Failed to clean up temporary files:', cleanupError.message)
                    }
                }
                throw error
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
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