//https://claude.ai/chat/27793a76-cc7f-4dc8-9bdc-7d8af8d7a292
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

async function uploadImage({ fileName, imagePath, imageBuffer, gitFolder, maxRetries = 3 }) {
    console.log('process.env.GH_TOKEN__', process.env.GH_TOKEN)

    // Extract file extension from the original image path or fileName
    const fileExtension = path.extname(imagePath || fileName) || '.png'
    const fullFileName = fileName.includes('.') ? fileName : `${fileName}${fileExtension}`

    let base64data

    try {
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
    } catch (error) {
        throw new Error(`Failed to process image: ${error.message}`)
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
                
                return {
                    response,
                    url: responseData.content.html_url,
                    downloadUrl: responseData.content.download_url,
                    fileName: fullFileName
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
                throw error
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        }
    }
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
        return await uploadWithRetry({ fullFileName, base64data, gitFolder, maxRetries })
        
    } catch (error) {
        throw new Error(`Failed to upload image from URL: ${error.message}`)
    }
}

// Helper function to reduce code duplication
async function uploadWithRetry({ fullFileName, base64data, gitFolder, maxRetries }) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to upload ${fullFileName}`)
            
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
                const { sha } = await responsesha.json()
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