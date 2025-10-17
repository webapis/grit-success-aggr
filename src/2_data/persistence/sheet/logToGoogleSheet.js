
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { pipe } from '../../../shared/pipe.js';

// --- STAGES ---

const initializeJWT = async (context) => {
    const { serviceAccountCredentials } = context;
    const jwtClient = new JWT({
        email: serviceAccountCredentials.client_email,
        key: serviceAccountCredentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return { ...context, jwtClient };
};

const loadSpreadsheet = async (context) => {
    const { sheetId, jwtClient } = context;
    const doc = new GoogleSpreadsheet(sheetId, jwtClient);
    await doc.loadInfo();
    return { ...context, doc };
};

const getOrCreateSheet = async (context) => {
    const { doc, sheetTitle, rowData, sampleData } = context;
    let sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) {
        console.log(`Creating new sheet: ${sheetTitle}`);
        const requiredColumns = Math.max(Object.keys(rowData || sampleData || {}).length + 10, 60);
        sheet = await doc.addSheet({ 
            title: sheetTitle,
            columnCount: requiredColumns,
            rowCount: 1000
        });
    }
    return { ...context, sheet };
};

const ensureSufficientColumns = async (context) => {
    let { sheet, rowData, doc, sheetTitle } = context;
    const newHeaders = Object.keys(rowData);
    if (newHeaders.length > sheet.columnCount) {
        console.log(`Expanding sheet from ${sheet.columnCount} to ${newHeaders.length + 10} columns...`);
        await sheet.resize({
            rowCount: Math.max(sheet.rowCount, 1000),
            columnCount: newHeaders.length + 10
        });
        await doc.loadInfo();
        sheet = doc.sheetsByTitle[sheetTitle];
    }
    return { ...context, sheet, newHeaders };
};

const manageHeaders = async (context) => {
    const { sheet, newHeaders } = context;
    let currentHeaders = [];
    try {
        await sheet.loadHeaderRow();
        currentHeaders = sheet.headerValues || [];
    } catch (headerError) {
        console.log('No headers found or unable to load headers');
        currentHeaders = [];
    }

    if (currentHeaders.length === 0) {
        console.log('Setting initial headers...');
        await sheet.setHeaderRow(newHeaders);
    } else {
        const missingHeaders = newHeaders.filter(h => !currentHeaders.includes(h));
        if (missingHeaders.length > 0) {
            console.log(`Adding ${missingHeaders.length} missing headers:`, missingHeaders);
            const combinedHeaders = [...new Set([...currentHeaders, ...newHeaders])];
            await sheet.setHeaderRow(combinedHeaders);
        }
    }
    await sheet.loadHeaderRow();
    return context;
};

const addRowData = async (context) => {
    const { sheet, rowData } = context;
    console.log('Adding row data...');
    await sheet.addRow(rowData);
    return context;
};

const formatOutput = async (context) => {
    const { sheet, newHeaders } = context;
    console.log('Successfully logged data to Google Sheet');
    return {
        success: true, 
        rowsAdded: 1, 
        columnsUsed: newHeaders.length,
        totalColumns: sheet.columnCount,
        headers: sheet.headerValues
    };
};

const handleError = (error) => {
    console.error('Error logging to Google Sheet:', error);
    if (error.message?.includes('No values in the header row')) {
        console.error('HEADER ERROR: The sheet exists but has no headers.');
        console.error('SOLUTION: The function will try to set headers automatically.');
    } else if (error.message?.includes('not large enough')) {
        console.error('COLUMN ERROR: Not enough columns in the sheet.');
    }
    throw error;
};

// --- PIPELINE ---

const logToGoogleSheetPipeline = pipe(
    initializeJWT,
    loadSpreadsheet,
    getOrCreateSheet,
    ensureSufficientColumns,
    manageHeaders,
    addRowData,
    formatOutput
);

export async function logToGoogleSheet(options) {
    try {
        return await logToGoogleSheetPipeline(options);
    } catch (error) {
        handleError(error);
    }
}

// --- STAGES FOR SIMPLE LOGGING ---

const determineNextRow = async (context) => {
    const { sheet } = context;
    const rows = await sheet.getRows();
    const nextRow = rows.length + 1;
    console.log(`Writing to row ${nextRow}...`);
    return { ...context, nextRow };
};

const writeHeadersSimple = async (context) => {
    const { sheet, rowData, nextRow } = context;
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
    return context;
};

const writeDataSimple = async (context) => {
    const { sheet, rowData, nextRow } = context;
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
    return { ...context };
};

const formatOutputSimple = async (context) => {
    const { nextRow } = context;
    return { success: true, rowsAdded: 1, rowNumber: nextRow + 1 };
};

const handleErrorSimple = (error) => {
    console.error('Error with simple logging method:', error);
    throw error;
};

// --- PIPELINE FOR SIMPLE LOGGING ---

const logToGoogleSheetSimplePipeline = pipe(
    initializeJWT,
    loadSpreadsheet,
    getOrCreateSheet, // This can be reused
    ensureSufficientColumns, // This can be reused
    determineNextRow,
    writeHeadersSimple,
    writeDataSimple,
    formatOutputSimple
);

export async function logToGoogleSheetSimple(options) {
    try {
        return await logToGoogleSheetSimplePipeline(options);
    } catch (error) {
        handleErrorSimple(error);
    }
}

// --- STAGES FOR RESETTING SHEET ---

const clearSheet = async (context) => {
    const { sheet } = context;
    if (sheet) {
        await sheet.clear();
        console.log('Sheet cleared');
    }
    return context;
};

const setHeaders = async (context) => {
    const { sheet, sampleData } = context;
    const headers = Object.keys(sampleData);
    await sheet.setHeaderRow(headers);
    console.log('Sheet reset successfully with headers:', headers);
    return { ...context, headers };
};

const formatResetOutput = async (context) => {
    return { success: true, message: 'Sheet reset and ready for data' };
};

const handleResetError = (error) => {
    console.error('Error resetting sheet:', error);
    throw error;
};

// --- PIPELINE FOR RESETTING SHEET ---

const resetSheetPipeline = pipe(
    initializeJWT,
    loadSpreadsheet,
    getOrCreateSheet,
    clearSheet,
    setHeaders,
    formatResetOutput
);

export async function resetSheet(options) {
    try {
        return await resetSheetPipeline(options);
    } catch (error) {
        handleResetError(error);
    }
}
