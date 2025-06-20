
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import urls from '../sites/products/urls.json' assert { type: 'json' };

const site = process.env.site;

const siteUrls = urls.find(f => f.site === site)
export async function logDataToGoogleSheet({
  dataWithoutErrorLength,
  dataWithErrorLength,
  site,
  serviceAccountCredentials,
  start,
  end,
  span,
  totalPages = 0,
  uniquePageURLs
}) {
  try {
    // Create a new JWT client for authentication
    const jwtClient = new JWT({
      email: serviceAccountCredentials.client_email,
      key: serviceAccountCredentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Initialize the Google Spreadsheet
    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID,
      jwtClient
    );

    // Load the document
    await doc.loadInfo();

    // Get the first sheet (or create one if it doesn't exist)
    let sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: 'Data Collection Logs'
      });
    }

    // Explicitly load the sheet
    await sheet.loadHeaderRow();

    // Check and set headers if not exist
    const headerValues = [
      'Site',
      'Successful Entries',
      'Error Entries',
      'Start Time',
      'End Time',
      'Span (min)',
      'Total Pages',
      'Unique Page URLs'
    ];

    if (sheet.headerValues.length === 0) {
      await sheet.setHeaderRow(headerValues);
    }
    if (siteUrls.paused) {
      console.log(`Site ${site} is paused from aggregating. Adding paused entry to Google Sheet.`);
      await sheet.addRow({
        'Site': site,
        'Successful Entries': 'paused',
        'Error Entries': 'paused',

        'Start Time': 'paused',
        'End Time': 'paused',
        'Span (min)': 'paused',
        'Total Pages': 'paused',
        'Unique Page URLs': 'paused'


      });
    } else {
      // Add a new row with the current data
      await sheet.addRow({
        'Site': site,
        'Successful Entries': dataWithoutErrorLength,
        'Error Entries': dataWithErrorLength,
        'Start Time': start,
        'End Time': end,
        'Span (min)': span,
        'Total Pages': totalPages,
        'Unique Page URLs': uniquePageURLs.length // Assuming you want to log this as well, set to 0 or modify as needed


      });
    }


    console.log('Successfully logged data to Google Sheet');
  } catch (error) {
    console.error('Error logging to Google Sheet:', error);

    // More detailed error logging
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }

    throw error;
  }
}
