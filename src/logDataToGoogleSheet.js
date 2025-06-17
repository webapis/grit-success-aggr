
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export async function logDataToGoogleSheet({
  dataWithoutErrorLength, 
  dataWithErrorLength, 
  site,
  serviceAccountCredentials
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
      'Timestamp', 
      'Site', 
      'Successful Entries', 
      'Error Entries'
    ];

    if (sheet.headerValues.length === 0) {
      await sheet.setHeaderRow(headerValues);
    }

    // Add a new row with the current data
    await sheet.addRow({
      'Timestamp': new Date().toISOString(),
      'Site': site,
      'Successful Entries': dataWithoutErrorLength,
      'Error Entries': dataWithErrorLength
    });

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
//-----------------------------------------------------------------------------------------------
// import { GoogleSpreadsheet } from 'google-spreadsheet';
// import { JWT } from 'google-auth-library';

// export async function logDataToGoogleSheet({
//   dataWithoutErrorLength, 
//   dataWithErrorLength, 
//   site,
//   serviceAccountCredentials,
//   GOOGLE_SHEET_ID
// }) {
//   try {
//     // Create a new JWT client for authentication
//     const jwtClient = new JWT({
//       email: serviceAccountCredentials.client_email,
//       key: serviceAccountCredentials.private_key,
//       scopes: ['https://www.googleapis.com/auth/spreadsheets']
//     });

//     // Initialize the Google Spreadsheet
//     const doc = new GoogleSpreadsheet(
//    GOOGLE_SHEET_ID, 
//       jwtClient
//     );

//     // Load the document
//     await doc.loadInfo();

//     // Get the first sheet (or create one if it doesn't exist)
//     let sheet = doc.sheetsByIndex[0];
//     if (!sheet) {
//       sheet = await doc.addSheet({ 
//         title: 'Data Collection Logs'
//       });
//     }

//     // Ensure headers exist
//     if (sheet.headerValues.length === 0) {
//       await sheet.setHeaderRow([
//         'Timestamp', 
//         'Site', 
//         'Successful Entries', 
//         'Error Entries'
//       ]);
//     }

//     // Add a new row with the current data
//     await sheet.addRow({
//       'Timestamp': new Date().toISOString(),
//       'Site': site,
//       'Successful Entries': dataWithoutErrorLength,
//       'Error Entries': dataWithErrorLength
//     });

//     console.log('Successfully logged data to Google Sheet');
//   } catch (error) {
//     console.error('Error logging to Google Sheet:', error);
//     throw error;
//   }
// }




















//-----------------------------------------------------------------


// import { GoogleSpreadsheet } from 'google-spreadsheet';
// import { JWT } from 'google-auth-library';

// export async function logDataToGoogleSheet({
//   dataWithoutErrorLength, 
//   dataWithErrorLength, 
//   site,
//   serviceAccountCredentials,
//   GOOGLE_SHEET_ID
// }) {
//   try {
//     // Create a new JWT client for authentication
//     const jwtClient = new JWT({
//       email: serviceAccountCredentials.client_email,
//       key: serviceAccountCredentials.private_key,
//       scopes: ['https://www.googleapis.com/auth/spreadsheets']
//     });

//     // Initialize the Google Spreadsheet
//     const doc = new GoogleSpreadsheet(
//      GOOGLE_SHEET_ID, 
//       jwtClient
//     );

//     // Load the document
//     await doc.loadInfo();

//     // Get the first sheet (or create one if it doesn't exist)
//     let sheet = doc.sheetsByIndex[0];
//     if (!sheet) {
//       sheet = await doc.addSheet({ 
//         title: 'Data Collection Logs',
//         headerValues: ['Timestamp', 'Site', 'Successful Entries', 'Error Entries']
//       });
//     }

//     // Add a new row with the current data
//     await sheet.addRow({
//       'Timestamp': new Date().toISOString(),
//       'Site': site,
//       'Successful Entries': dataWithoutErrorLength,
//       'Error Entries': dataWithErrorLength
//     });

//     console.log('Successfully logged data to Google Sheet');
//   } catch (error) {
//     console.error('Error logging to Google Sheet:', error);
//     throw error;
//   }
// }