import { google } from 'googleapis';
import { Readable } from 'stream';

export async function uploadToGoogleDrive({ buffer, fileName, folderId, serviceAccountCredentials }) {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountCredentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
  };

  const media = {
    mimeType: 'image/png',
    body: Readable.from(buffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink',
  });

  return file.data;
}
