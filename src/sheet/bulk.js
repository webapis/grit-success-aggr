import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

/**
 * Bulk logs multiple rows of data to a Google Sheet with robust header and column management.
 *
 * @param {Object} options
 * @param {string} options.sheetId - The ID of the Google Sheet.
 * @param {string} options.sheetTitle - (Optional) Title of the sheet to write to.
 * @param {Object} options.serviceAccountCredentials - Google service account credentials.
 * @param {Array<Object>} options.rowsData - Array of objects, each representing a row with key-value pairs for columns.
 * @param {boolean} options.clearExisting - (Optional) Whether to clear existing data before inserting. Default: false.
 */

export async function bulkLogToGoogleSheet({
  sheetId,
  sheetTitle = 'debug2',
  serviceAccountCredentials,
  rowsData,
  clearExisting = false
}) {
  if (!Array.isArray(rowsData) || rowsData.length === 0) {
    throw new Error('rowsData must be a non-empty array');
  }

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
      // Get all unique headers from all rows
      const allHeaders = [...new Set(rowsData.flatMap(row => Object.keys(row)))];
      const requiredColumns = Math.max(allHeaders.length + 10, 60);
      
      sheet = await doc.addSheet({ 
        title: sheetTitle,
        columnCount: requiredColumns,
        rowCount: Math.max(rowsData.length + 100, 1000)
      });
    }

    // Get all unique headers from all rows
    const allHeaders = [...new Set(rowsData.flatMap(row => Object.keys(row)))];
    console.log(`Required headers (${allHeaders.length}):`, allHeaders);

    // Check if sheet needs more columns
    if (allHeaders.length > sheet.columnCount) {
      console.log(`Expanding sheet from ${sheet.columnCount} to ${allHeaders.length + 10} columns...`);
      
      await sheet.resize({
        rowCount: Math.max(sheet.rowCount, rowsData.length + 100),
        columnCount: allHeaders.length + 10
      });
      
      // Reload after resize
      await doc.loadInfo();
      sheet = doc.sheetsByTitle[sheetTitle];
    }

    // Check if sheet needs more rows
    const estimatedRowsNeeded = rowsData.length + 50; // Buffer for existing data
    if (estimatedRowsNeeded > sheet.rowCount) {
      console.log(`Expanding sheet rows to ${estimatedRowsNeeded}...`);
      await sheet.resize({
        rowCount: estimatedRowsNeeded,
        columnCount: sheet.columnCount
      });
    }

    // Clear existing data if requested
    if (clearExisting) {
      await sheet.clear();
      console.log('Existing data cleared');
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
    if (currentHeaders.length === 0 || clearExisting) {
      // No headers exist or we cleared the sheet, set them
      console.log('Setting initial headers...');
      await sheet.setHeaderRow(allHeaders);
    } else {
      // Headers exist, check if we need to add new ones
      const missingHeaders = allHeaders.filter(h => !currentHeaders.includes(h));
      if (missingHeaders.length > 0) {
        console.log(`Adding ${missingHeaders.length} missing headers:`, missingHeaders);
        const combinedHeaders = [...new Set([...currentHeaders, ...allHeaders])];
        await sheet.setHeaderRow(combinedHeaders);
      }
    }

    // Reload headers after setting them
    await sheet.loadHeaderRow();
    console.log('Headers after update:', sheet.headerValues);

    // Add all rows in bulk
    console.log(`Adding ${rowsData.length} rows in bulk...`);
    const addedRows = await sheet.addRows(rowsData);
    
    console.log('Successfully bulk logged data to Google Sheet');
    return { 
      success: true, 
      rowsAdded: addedRows.length, 
      columnsUsed: allHeaders.length,
      totalColumns: sheet.columnCount,
      headers: sheet.headerValues
    };

  } catch (error) {
    console.error('Error bulk logging to Google Sheet:', error);
    
    // Provide specific guidance based on error type
    if (error.message?.includes('No values in the header row')) {
      console.error('HEADER ERROR: The sheet exists but has no headers.');
      console.error('SOLUTION: The function will try to set headers automatically.');
    } else if (error.message?.includes('not large enough')) {
      console.error('COLUMN ERROR: Not enough columns in the sheet.');
      console.error(`SOLUTION: Required columns: ${[...new Set(rowsData.flatMap(row => Object.keys(row)))].length}`);
    }
    
    throw error;
  }
}

 /**
 * Alternative bulk insert using batch cell updates for maximum performance
 */

export async function bulkLogToGoogleSheetCells({
  sheetId,
  sheetTitle = 'Sheet1',
  serviceAccountCredentials,
  rowsData,
  clearExisting = false,
  startRow = null // Optional: specify starting row (1-based)
}) {
  if (!Array.isArray(rowsData) || rowsData.length === 0) {
    throw new Error('rowsData must be a non-empty array');
  }

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
      const allHeaders = [...new Set(rowsData.flatMap(row => Object.keys(row)))];
      const requiredColumns = Math.max(allHeaders.length + 10, 60);
      
      sheet = await doc.addSheet({ 
        title: sheetTitle,
        columnCount: requiredColumns,
        rowCount: Math.max(rowsData.length + 100, 1000)
      });
    }

    // Get all unique headers
    const allHeaders = [...new Set(rowsData.flatMap(row => Object.keys(row)))];
    
    // Ensure sheet is large enough
    const neededRows = rowsData.length + 10;
    const neededCols = allHeaders.length + 5;
    
    if (neededRows > sheet.rowCount || neededCols > sheet.columnCount) {
      await sheet.resize({
        rowCount: Math.max(sheet.rowCount, neededRows),
        columnCount: Math.max(sheet.columnCount, neededCols)
      });
      
      await doc.loadInfo();
      sheet = doc.sheetsByTitle[sheetTitle];
    }

    if (clearExisting) {
      await sheet.clear();
    }

    // Determine starting row
    let dataStartRow = 2; // Default: row 2 (after headers)
    
    if (startRow !== null) {
      dataStartRow = startRow;
    } else if (!clearExisting) {
      // Find the next available row
      const rows = await sheet.getRows();
      dataStartRow = rows.length + 2; // +1 for header, +1 for next row
    }

    // Set up headers if needed
    const headerEndCol = String.fromCharCode(65 + allHeaders.length - 1);
    await sheet.loadCells(`A1:${headerEndCol}1`);
    
    // Check if headers need to be set
    let needHeaders = true;
    if (!clearExisting && dataStartRow > 2) {
      // Check if headers already exist
      const firstHeaderCell = sheet.getCell(0, 0);
      if (firstHeaderCell.value) {
        needHeaders = false;
      }
    }
    
    if (needHeaders) {
      allHeaders.forEach((header, index) => {
        const cell = sheet.getCell(0, index);
        cell.value = header;
      });
      console.log('Headers set');
    }

    // Prepare data range
    const dataEndRow = dataStartRow + rowsData.length - 1;
    const dataEndCol = String.fromCharCode(65 + allHeaders.length - 1);
    const dataRange = `A${dataStartRow}:${dataEndCol}${dataEndRow}`;
    
    console.log(`Loading data range: ${dataRange}`);
    await sheet.loadCells(dataRange);

    // Fill in the data
    rowsData.forEach((rowData, rowIndex) => {
      allHeaders.forEach((header, colIndex) => {
        const cell = sheet.getCell(dataStartRow - 1 + rowIndex, colIndex);
        cell.value = rowData[header] || '';
      });
    });

    // Save all changes in one batch
    console.log('Saving all cells...');
    await sheet.saveUpdatedCells();
    
    console.log(`Successfully bulk inserted ${rowsData.length} rows using cell method`);
    return { 
      success: true, 
      rowsAdded: rowsData.length,
      startingRow: dataStartRow,
      endingRow: dataEndRow,
      headers: allHeaders
    };

  } catch (error) {
    console.error('Error bulk logging with cells method:', error);
    throw error;
  }
}


/**
 * Utility function to append rows to existing data without clearing
 */

export async function appendBulkToGoogleSheet({
  sheetId,
  sheetTitle = 'Sheet1',
  serviceAccountCredentials,
  rowsData
}) {
  return bulkLogToGoogleSheet({
    sheetId,
    sheetTitle,
    serviceAccountCredentials,
    rowsData,
    clearExisting: false
  });
}


/**
 * Utility function to replace all data with new bulk data
 */

export async function replaceBulkInGoogleSheet({
  sheetId,
  sheetTitle = 'Sheet1',
  serviceAccountCredentials,
  rowsData
}) {
  return bulkLogToGoogleSheet({
    sheetId,
    sheetTitle,
    serviceAccountCredentials,
    rowsData,
    clearExisting: true
  });
}