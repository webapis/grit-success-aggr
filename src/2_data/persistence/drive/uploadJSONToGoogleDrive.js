import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Uploads a file buffer to Google Drive and returns public download and view links.
 */
export async function uploadJSONToGoogleDrive({
  buffer,
  fileName,
  mimeType = 'application/json',
  folderId,
  serviceAccountCredentials,
}) {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountCredentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = file.data.id;

  // Step 1: Make file public (anyone with link can view)
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Step 2: Return useful links
  return {
    fileId,
    webViewLink: file.data.webViewLink,
    downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    previewLink: `https://drive.google.com/file/d/${fileId}/view`,
  };
}
export default uploadJSONToGoogleDrive;