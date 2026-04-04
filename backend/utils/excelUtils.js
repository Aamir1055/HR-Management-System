/**
 * Excel Utility Functions
 * Centralized Excel file processing utilities for import/export operations
 */

const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { EmployeeFieldMappings } = require('../models/Employee');
const { excelDateToYYYYMMDD, dateToExcelSerial, formatDateForTemplate } = require('./dateUtils');

/**
 * Map Excel column names to standard field names
 * @param {Array} availableColumns - Available columns in Excel file
 * @param {Object} mappings - Field mappings object (excelColumn -> modelField)
 * @returns {Object} - Column mapping object (modelField -> excelColumn)
 */
function mapExcelColumns(availableColumns, mappings = EmployeeFieldMappings.excelToModel) {
  const columnMapping = {};

  // Normalize function: lower-case and remove spaces/underscores for robust matching
  const normalize = (s) => String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '');

  // Build a lookup from normalized available column -> actual column name
  const availableLookup = {};
  for (const col of availableColumns) {
    availableLookup[normalize(col)] = col;
  }

  // The mappings object has structure: { "Excel Column": "modelField" }
  // Reverse using normalized keys to find which Excel columns exist and map them to model fields
  for (const [excelColumnName, modelFieldName] of Object.entries(mappings)) {
    const norm = normalize(excelColumnName);
    if (norm in availableLookup) {
      if (!columnMapping[modelFieldName]) {
        columnMapping[modelFieldName] = availableLookup[norm];
      }
    }
  }

  return columnMapping;
}

/**
 * Validate required columns exist in Excel file
 * @param {Array} availableColumns - Available columns in Excel file
 * @param {Array} requiredColumns - Required column standard names
 * @param {Object} columnMapping - Column mapping object
 * @returns {Object} - Validation result
 */
function validateRequiredColumns(availableColumns, requiredColumns, columnMapping) {
  const missingColumns = [];
  
  requiredColumns.forEach(standardName => {
    if (!columnMapping[standardName]) {
      // Flexible handling for name vs first/last name combinations
      if (standardName === 'name') {
        const hasFirstLast = !!(columnMapping['first_name'] && columnMapping['last_name']);
        if (hasFirstLast) {
          return; // treat as satisfied if both first and last name columns exist
        }
      }
      missingColumns.push(standardName);
    }
  });
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns,
    availableColumns
  };
}

/**
 * Read Excel file and return structured data
 * @param {string} filePath - Path to Excel file
 * @returns {Object} - Parsed Excel data and metadata
 */
function readExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];
    
    return {
      success: true,
      data,
      sheetName,
      availableColumns,
      rowCount: data.length
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read Excel file: ${error.message}`,
      data: [],
      availableColumns: [],
      rowCount: 0
    };
  }
}

/**
 * Process Excel row data using column mappings
 * @param {Object} row - Excel row data
 * @param {Object} columnMapping - Column mapping object
 * @returns {Object} - Processed row data
 */
function processExcelRow(row, columnMapping) {
  const processedRow = {};
  
  // Map Excel columns to standard field names
  Object.keys(columnMapping).forEach(standardName => {
    const excelColumnName = columnMapping[standardName];
    processedRow[standardName] = row[excelColumnName];
  });
  
  // Add any unmapped fields that might be important
  Object.keys(row).forEach(key => {
    const mappedKey = Object.values(columnMapping).includes(key) ? 
      Object.keys(columnMapping).find(k => columnMapping[k] === key) : 
      key.toLowerCase().replace(/\s+/g, '_');
    
    if (!processedRow[mappedKey]) {
      processedRow[mappedKey] = row[key];
    }
  });
  
  return processedRow;
}

/**
 * Process date fields in Excel row
 * @param {Object} processedRow - Processed row data
 * @param {Array} dateFields - Array of date field names
 * @returns {Object} - Row with processed dates
 */
function processDateFields(processedRow, dateFields = ['joiningDate', 'dob', 'passport_expiry', 'visa_expiry']) {
  const result = { ...processedRow };
  
  dateFields.forEach(field => {
    if (result[field]) {
      result[field] = excelDateToYYYYMMDD(result[field]);
    }
  });
  
  return result;
}

/**
 * Create Excel workbook with employee template
 * @param {Array} templateData - Template data
 * @param {Object} referenceData - Reference data (offices, positions, etc.)
 * @returns {Object} - Excel workbook
 */
function createEmployeeTemplate(templateData, referenceData = {}) {
  const wb = XLSX.utils.book_new();
  
  // Main template sheet
  const templateWithFormattedDates = templateData.map(item => ({
    ...item,
    'Joining Date': item['Joining Date'] ? formatDateForTemplate(item['Joining Date']) : '',
    'DOB': item['DOB'] ? formatDateForTemplate(item['DOB']) : '',
    'Passport Expiry': item['Passport Expiry'] ? formatDateForTemplate(item['Passport Expiry']) : '',
    'Visa Expiry': item['Visa Expiry'] ? formatDateForTemplate(item['Visa Expiry']) : ''
  }));
  
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(templateWithFormattedDates), 'Template');
  
  // Reference data sheets
  if (referenceData.offices) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referenceData.offices), 'Offices');
  }
  if (referenceData.positions) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referenceData.positions), 'Positions');
  }
  if (referenceData.visaTypes) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referenceData.visaTypes), 'VisaTypes');
  }
  if (referenceData.platforms) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(referenceData.platforms), 'Platforms');
  }
  
  return wb;
}

/**
 * Create Excel export with advanced formatting using ExcelJS
 * @param {Array} exportData - Data to export
 * @param {Object} options - Export options
 * @returns {Object} - ExcelJS workbook with formatting
 */
function createEmployeeExport(exportData, options = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Employees', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  if (!exportData.length) return wb;

  // Define columns from the first row's keys
  const headers = Object.keys(exportData[0]);
  ws.columns = headers.map(header => ({
    header,
    key: header,
    width: getColumnWidth(header)
  }));

  // Add data rows
  exportData.forEach(row => ws.addRow(row));

  // Style the header row
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' } // Blue header
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  // Style data rows with alternating colours and borders
  for (let r = 2; r <= exportData.length + 1; r++) {
    const row = ws.getRow(r);
    const isEven = r % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD6E4F0' } // Light blue alternating row
        };
      }
      cell.alignment = { vertical: 'middle' };
    });
  }

  // Auto-filter on all columns
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: exportData.length + 1, column: headers.length }
  };

  return wb;
}

/**
 * Get appropriate column width for a header name
 */
function getColumnWidth(header) {
  const widths = {
    'Employee ID': 14,
    'Full Name': 20,
    'Date of Birth': 15,
    'Date of Joining': 15,
    'Nationality': 14,
    'Passport Number': 17,
    'Passport Expiry': 15,
    'Visa Type': 14,
    'Visa Expiry': 15,
    'Office': 22,
    'Platform': 16,
    'Position': 20,
    'Monthly Salary': 16,
    'Shift Time': 26,
    'Email': 28,
    'Phone': 18,
    'WhatsApp': 18,
    'Gender': 10,
    'Marital Status': 15,
    'Primary Language': 16,
    'Secondary Language': 16,
    'Hiring Source': 15,
    'Emergency Contact Relation': 22,
    'Status': 10,
    'Comments': 40
  };
  return widths[header] || 15;
}

/**
 * Generate Excel buffer for download
 * Supports both ExcelJS and SheetJS workbooks
 * @param {Object} workbook - Excel workbook object
 * @returns {Promise<Buffer>|Buffer} - Excel file buffer
 */
function generateExcelBuffer(workbook) {
  // ExcelJS workbook has xlsx property
  if (workbook.xlsx) {
    return workbook.xlsx.writeBuffer();
  }
  // SheetJS workbook (used by template export)
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true
  });
}

/**
 * Validate Excel file structure
 * @param {Object} excelData - Excel data from readExcelFile
 * @param {Array} requiredColumns - Required column standard names
 * @returns {Object} - Validation result
 */
function validateExcelStructure(excelData, requiredColumns) {
  if (!excelData.success) {
    return {
      isValid: false,
      errors: [excelData.error]
    };
  }
  
  if (excelData.rowCount === 0) {
    return {
      isValid: false,
      errors: ['Excel file contains no data rows']
    };
  }
  
  const columnMapping = mapExcelColumns(excelData.availableColumns);
  const columnValidation = validateRequiredColumns(excelData.availableColumns, requiredColumns, columnMapping);
  
  if (!columnValidation.isValid) {
    return {
      isValid: false,
      errors: [
        `Missing required columns: ${columnValidation.missingColumns.join(', ')}`,
        `Available columns: ${columnValidation.availableColumns.join(', ')}`
      ]
    };
  }
  
  return {
    isValid: true,
    columnMapping,
    rowCount: excelData.rowCount
  };
}

module.exports = {
  mapExcelColumns,
  validateRequiredColumns,
  readExcelFile,
  processExcelRow,
  processDateFields,
  createEmployeeTemplate,
  createEmployeeExport,
  generateExcelBuffer,
  validateExcelStructure
};
