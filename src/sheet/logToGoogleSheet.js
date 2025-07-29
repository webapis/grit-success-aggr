import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

/**
 * Logs a row of data to a Google Sheet.
 *
 * @param {Object} options
 * @param {string} options.sheetId - The ID of the Google Sheet.
 * @param {string} options.sheetTitle - (Optional) Title of the sheet to write to.
 * @param {Object} options.serviceAccountCredentials - Google service account credentials.
 * @param {Object} options.rowData - The key-value pairs for columns and their values.
 */
export async function logToGoogleSheet({
  sheetId,
  sheetTitle ,
  serviceAccountCredentials,
  rowData
}) {
    debugger
  try {
    const jwtClient = new JWT({
      email: serviceAccountCredentials.client_email,
      key: serviceAccountCredentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(sheetId, jwtClient);
    await doc.loadInfo();

    // Get or create the sheet
    let sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) {
      sheet = await doc.addSheet({ title: sheetTitle });
    }

    await sheet.loadHeaderRow();
debugger
    // Set header row if missing
    const currentHeaders = sheet.headerValues || [];
    const newHeaders = Object.keys(rowData);
    console.log('Current Headers:----------', currentHeaders);
debugger
    if (currentHeaders.length === 0) {
        debugger
      await sheet.setHeaderRow(newHeaders);
    } else {
        debugger
      // Update headers if any are missing
      const missingHeaders = newHeaders.filter(h => !currentHeaders.includes(h));
      if (missingHeaders.length > 0) {
        await sheet.setHeaderRow([...new Set([...currentHeaders, ...missingHeaders])]);
      }
    }

    // Add the new row
    await sheet.addRow(rowData);

    console.log('Successfully logged data to Google Sheet');
  } catch (error) {
    console.error('Error logging to Google Sheet:', error);
    if (error.response) {
        debugger
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
}
