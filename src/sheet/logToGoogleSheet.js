import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

/**
 * Logs a row of data to a Google Sheet with robust header and column management.
 *
 * @param {Object} options
 * @param {string} options.sheetId - The ID of the Google Sheet.
 * @param {string} options.sheetTitle - (Optional) Title of the sheet to write to.
 * @param {Object} options.serviceAccountCredentials - Google service account credentials.
 * @param {Object} options.rowData - The key-value pairs for columns and their values.
 */
export async function logToGoogleSheet({
  sheetId,
  sheetTitle = 'Sheet1',
  serviceAccountCredentials,
  rowData
}) {

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
      console.log(`Creating new sheet: ${sheetTitle}`);
      const requiredColumns = Math.max(Object.keys(rowData).length + 10, 60);
      
      sheet = await doc.addSheet({ 
        title: sheetTitle,
        columnCount: requiredColumns,
        rowCount: 1000
      });
    }

    // Get the headers we need
    const newHeaders = Object.keys(rowData);
    console.log(`Required headers (${newHeaders.length}):`, newHeaders);

    // Check if sheet needs more columns
    if (newHeaders.length > sheet.columnCount) {
      console.log(`Expanding sheet from ${sheet.columnCount} to ${newHeaders.length + 10} columns...`);
      
      await sheet.resize({
        rowCount: Math.max(sheet.rowCount, 1000),
        columnCount: newHeaders.length + 10
      });
      
      // Reload after resize
      await doc.loadInfo();
      sheet = doc.sheetsByTitle[sheetTitle];
    }

    // Try to load existing headers
    let currentHeaders = [];
    try {
      await sheet.loadHeaderRow();
      currentHeaders = sheet.headerValues || [];
    } catch (headerError) {
      console.log('No headers found or unable to load headers');
      currentHeaders = [];
    }

    console.log(`Current headers (${currentHeaders.length}):`, currentHeaders);

    // Always set/update headers to ensure they exist
    if (currentHeaders.length === 0) {
      // No headers exist, set them
      console.log('Setting initial headers...');
      await sheet.setHeaderRow(newHeaders);
    } else {
      // Headers exist, check if we need to add new ones
      const missingHeaders = newHeaders.filter(h => !currentHeaders.includes(h));
      if (missingHeaders.length > 0) {
        console.log(`Adding ${missingHeaders.length} missing headers:`, missingHeaders);
        const combinedHeaders = [...new Set([...currentHeaders, ...newHeaders])];
        await sheet.setHeaderRow(combinedHeaders);
      }
    }

    // Reload headers after setting them
    await sheet.loadHeaderRow();
    console.log('Headers after update:', sheet.headerValues);

    // Add the row data
    console.log('Adding row data...');
    const addedRow = await sheet.addRow(rowData);
    
    console.log('Successfully logged data to Google Sheet');
    return { 
      success: true, 
      rowsAdded: 1, 
      columnsUsed: newHeaders.length,
      totalColumns: sheet.columnCount,
      headers: sheet.headerValues
    };

  } catch (error) {
    console.error('Error logging to Google Sheet:', error);
    
    // Provide specific guidance based on error type
    if (error.message?.includes('No values in the header row')) {
      console.error('HEADER ERROR: The sheet exists but has no headers.');
      console.error('SOLUTION: The function will try to set headers automatically.');
    } else if (error.message?.includes('not large enough')) {
      console.error('COLUMN ERROR: Not enough columns in the sheet.');
      console.error(`SOLUTION: Required columns: ${Object.keys(rowData).length}`);
    }
    
    throw error;
  }
}

/**
 * Simple fallback function that writes data directly without using headers
 */
export async function logToGoogleSheetSimple({
  sheetId,
  sheetTitle = 'Sheet1',
  serviceAccountCredentials,
  rowData
}) {
  try {
    const jwtClient = new JWT({
      email: serviceAccountCredentials.client_email,
      key: serviceAccountCredentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(sheetId, jwtClient);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle[sheetTitle];
    
    if (!sheet) {
      const requiredColumns = Object.keys(rowData).length + 10;
      sheet = await doc.addSheet({ 
        title: sheetTitle,
        columnCount: requiredColumns,
        rowCount: 1000
      });
    }

    // Ensure enough columns
    if (Object.keys(rowData).length > sheet.columnCount) {
      await sheet.resize({
        rowCount: sheet.rowCount,
        columnCount: Object.keys(rowData).length + 10
      });
    }

    // Get current data to determine next row
    const rows = await sheet.getRows();
    const nextRow = rows.length + 1;

    console.log(`Writing to row ${nextRow}...`);

    // If this is the first row, write headers
    if (nextRow === 1) {
      const headers = Object.keys(rowData);
      await sheet.loadCells(`A1:${String.fromCharCode(65 + headers.length - 1)}1`);
      
      headers.forEach((header, index) => {
        const cell = sheet.getCell(0, index);
        cell.value = header;
      });
      
      await sheet.saveUpdatedCells();
      console.log('Headers written to first row');
    }

    // Write data to the next available row
    const values = Object.values(rowData);
    const startCol = 'A';
    const endCol = String.fromCharCode(65 + values.length - 1);
    
    await sheet.loadCells(`${startCol}${nextRow + 1}:${endCol}${nextRow + 1}`);
    
    values.forEach((value, index) => {
      const cell = sheet.getCell(nextRow, index);
      cell.value = value;
    });
    
    await sheet.saveUpdatedCells();
    
    console.log('Successfully wrote data using simple method');
    return { success: true, rowsAdded: 1, rowNumber: nextRow + 1 };

  } catch (error) {
    console.error('Error with simple logging method:', error);
    throw error;
  }
}

/**
 * Utility function to clear and reset a sheet
 */
export async function resetSheet({
  sheetId,
  sheetTitle = 'Sheet1',
  serviceAccountCredentials,
  sampleData
}) {
  try {
    const jwtClient = new JWT({
      email: serviceAccountCredentials.client_email,
      key: serviceAccountCredentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(sheetId, jwtClient);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle[sheetTitle];
    
    if (sheet) {
      // Clear all data
      await sheet.clear();
      console.log('Sheet cleared');
    } else {
      // Create new sheet
      const requiredColumns = Object.keys(sampleData).length + 10;
      sheet = await doc.addSheet({ 
        title: sheetTitle,
        columnCount: requiredColumns,
        rowCount: 1000
      });
      console.log('New sheet created');
    }

    // Set fresh headers
    const headers = Object.keys(sampleData);
    await sheet.setHeaderRow(headers);
    
    console.log('Sheet reset successfully with headers:', headers);
    return { success: true, message: 'Sheet reset and ready for data' };

  } catch (error) {
    console.error('Error resetting sheet:', error);
    throw error;
  }
}