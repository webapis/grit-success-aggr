//https://claude.ai/chat/27793a76-cc7f-4dc8-9bdc-7d8af8d7a292
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

async function uploadImage({ fileName, imagePath, imageBuffer, gitFolder, maxRetries = 3 }) {

    // Extract file extension from the original image path or fileName
    const fileExtension = path.extname(imagePath || fileName) || '.png'
    const fullFileName = fileName.includes('.') ? fileName : `${fileName}${fileExtension}`

    let base64data

    // Handle different input types
    if (imageBuffer && Buffer.isBuffer(imageBuffer)) {
        // Handle Puppeteer screenshot buffer directly
        base64data = imageBuffer.toString('base64')
    } else if (imagePath && fs.existsSync(imagePath)) {
        // Read from file path
        const buffer = fs.readFileSync(imagePath)
        base64data = buffer.toString('base64')
    } else {
        throw new Error('Invalid image source: provide either imageBuffer (from Puppeteer) or valid imagePath')
    }

    // Use the shared helper function to perform the upload
    return await uploadWithRetry({
        fullFileName,
        base64data,
        gitFolder,
        maxRetries,
        repo: 'webapis/crawler-state-2',
        branch: 'main'
    });
}

// Alternative function for uploading image from URL
async function uploadImageFromUrl({ fileName, imageUrl, gitFolder, maxRetries = 3 }) {
    console.log('Downloading image from URL:', imageUrl)
    
    try {
        // Download the image
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`)
        }
        
        const imageBuffer = await imageResponse.buffer()
        
        // Extract file extension from URL or use default
        const urlPath = new URL(imageUrl).pathname
        const fileExtension = path.extname(urlPath) || '.jpg'
        const fullFileName = fileName.includes('.') ? fileName : `${fileName}${fileExtension}`
        
        // Convert buffer to base64
        const base64data = imageBuffer.toString('base64')
        
        // Use the same upload logic as uploadImage
        return await uploadWithRetry({
            fullFileName,
            base64data,
            gitFolder,
            maxRetries,
            repo: 'webapis/crawler-state-2',
            branch: 'main'
        })
        
    } catch (error) {
        throw new Error(`Failed to upload image from URL: ${error.message}`)
    }
}

// Helper function to reduce code duplication
async function uploadWithRetry({ fullFileName, base64data, gitFolder, maxRetries, repo, branch }) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to upload ${fullFileName} to ${repo} on branch ${branch}`)
            
            const responsesha = await fetch(`https://api.github.com/repos/${repo}/contents/${gitFolder}/${fullFileName}?ref=${branch}`, { 
                method: 'get', 
                headers: { 
                    Accept: "application/vnd.github.v3+json", 
                    authorization: `token ${process.env.GH_TOKEN}`, 
                    "X-GitHub-Api-Version": "2022-11-28" 
                } 
            })

            let response;

            if (responsesha.ok) {
                const { sha } = await responsesha.json()
                response = await fetch(`https://api.github.com/repos/${repo}/contents/${gitFolder}/${fullFileName}`, { 
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
                        branch: branch 
                    }) 
                })
            } else if (responsesha.status === 404) {
                response = await fetch(`https://api.github.com/repos/${repo}/contents/${gitFolder}/${fullFileName}`, { 
                    method: 'put', 
                    headers: { 
                        Accept: "application/vnd.github.v3+json", 
                        authorization: `token ${process.env.GH_TOKEN}`, 
                        "X-GitHub-Api-Version": "2022-11-28" 
                    }, 
                    body: JSON.stringify({ 
                        message: `Create ${fullFileName} - attempt ${attempt}`, 
                        content: base64data, 
                        branch: branch 
                    }) 
                })
            } else {
                throw new Error(`Failed to fetch file info: ${responsesha.status} ${responsesha.statusText}`)
            }

            if (response.ok) {
                const responseData = await response.json()
                console.log(`✅ Successfully uploaded ${fullFileName} on attempt ${attempt}`)
                return {
                    response,
                    url: responseData.content.html_url,
                    downloadUrl: responseData.content.download_url,
                    fileName: fullFileName
                }
            } else if (response.status === 409 && attempt < maxRetries) {
                console.warn(`⚠️ Conflict detected on attempt ${attempt}. Retrying...`)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
                continue
            } else {
                const errorBody = await response.text()
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorBody}`)
            }

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message)
            if (attempt === maxRetries) throw error
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        }
    }
}

export { uploadImage, uploadImageFromUrl }