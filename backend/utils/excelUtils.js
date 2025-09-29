/**
 * Excel Utility Functions
 * Centralized Excel file processing utilities for import/export operations
 */

const XLSX = require('xlsx');
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
  
  // The mappings object has structure: { "Excel Column": "modelField" }
  // We need to reverse this to find which Excel columns exist and map them to model fields
  for (const [excelColumnName, modelFieldName] of Object.entries(mappings)) {
    // Check if this Excel column name exists in the available columns
    if (availableColumns.includes(excelColumnName)) {
      // Only map if we haven't already mapped this model field
      if (!columnMapping[modelFieldName]) {
        columnMapping[modelFieldName] = excelColumnName;
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
 * Create Excel export with advanced formatting
 * @param {Array} exportData - Data to export
 * @param {Object} options - Export options
 * @returns {Object} - Excel workbook with formatting
 */
function createEmployeeExport(exportData, options = {}) {
  const wb = XLSX.utils.book_new();
  
  // Convert dates to Excel serial numbers for proper sorting (with +1 day fix)
  const processedData = exportData.map(emp => ({
    ...emp,
    'Date of Birth': emp['Date of Birth'] ? dateToExcelSerial(emp['Date of Birth']) : null,
    'Date of Joining': emp['Date of Joining'] ? dateToExcelSerial(emp['Date of Joining']) : null,
    'Passport Expiry': emp['Passport Expiry'] ? dateToExcelSerial(emp['Passport Expiry']) : null,
    'Visa Expiry': emp['Visa Expiry'] ? dateToExcelSerial(emp['Visa Expiry']) : null
  }));
  
  const ws = XLSX.utils.json_to_sheet(processedData);
  
  // Apply advanced formatting
  if (options.enableFormatting !== false) {
    // Set date cell types and formatting for proper sorting
    const dateColumns = ['D', 'E', 'H', 'J']; // Date of Birth, Date of Joining, Passport Expiry, Visa Expiry
    for (let row = 2; row <= processedData.length + 1; row++) {
      for (const col of dateColumns) {
        const cellRef = `${col}${row}`;
        if (ws[cellRef] && ws[cellRef].v && typeof ws[cellRef].v === 'number') {
          // Set as date type with proper formatting for Excel sorting
          ws[cellRef].t = 'd'; // Date type
          ws[cellRef].z = 'dd/mm/yyyy'; // DD/MM/YYYY format
          
          // Convert Excel serial number back to JavaScript Date object
          const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));
          const MS_PER_DAY = 86400000;
          const dateValue = new Date(EXCEL_EPOCH.getTime() + (ws[cellRef].v * MS_PER_DAY));
          
          // Set the cell value as a Date object for proper Excel recognition
          ws[cellRef].v = dateValue;
        }
      }
    }
    
    // Set column widths for better visibility
    const columnWidths = [
      { wch: 12 }, // Employee ID
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 14 }, // Date of Birth
      { wch: 14 }, // Date of Joining
      { wch: 12 }, // Nationality
      { wch: 15 }, // Passport Number
      { wch: 14 }, // Passport Expiry
      { wch: 12 }, // Visa Type
      { wch: 14 }, // Visa Expiry
      { wch: 20 }, // Office
      { wch: 15 }, // Platform
      { wch: 18 }, // Position
      { wch: 15 }, // Monthly Salary
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 15 }, // WhatsApp
      { wch: 10 }, // Gender
      { wch: 15 }, // Marital Status
      { wch: 15 }, // Primary Language
      { wch: 15 }, // Secondary Language
      { wch: 15 }, // Hiring Source
      { wch: 30 }, // Current Address
      { wch: 20 }, // Emergency Contact Relation
      { wch: 18 }, // Emergency Contact
      { wch: 10 }  // Status
    ];
    
    ws['!cols'] = columnWidths;
    
    // Add freeze panes to keep headers visible when scrolling
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    
    // Apply auto-filter to the entire data range
    if (processedData.length > 0) {
      const numCols = Object.keys(processedData[0]).length;
      const numRows = processedData.length;
      const filterRange = `A1:${XLSX.utils.encode_col(numCols - 1)}${numRows + 1}`;
      ws['!autofilter'] = { ref: filterRange };
      
      // Style the headers for better filter visibility
      for (let col = 0; col < numCols; col++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[headerCell]) {
          ws[headerCell].s = {
            font: { bold: true },
            alignment: { horizontal: 'center' },
            fill: { fgColor: { rgb: 'E6E6FA' } } // Light lavender background
          };
        }
      }
    }
  }
  
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  
  return wb;
}

/**
 * Generate Excel buffer for download
 * @param {Object} workbook - Excel workbook object
 * @param {Object} options - Generation options
 * @returns {Buffer} - Excel file buffer
 */
function generateExcelBuffer(workbook, options = {}) {
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: options.compression !== false // Enable compression by default
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
