/**
 * Employee Import Service
 * Handles Excel import/export operations for employee data
 * Manages file processing, validation, and bulk operations
 */

const fs = require('fs');
const { Employee, RequiredFields, EmployeeFieldMappings } = require('../models/Employee');
const { formatDateForTemplate } = require('../utils/dateUtils');
const { 
  readExcelFile, 
  validateExcelStructure, 
  mapExcelColumns, 
  processExcelRow, 
  processDateFields,
  createEmployeeTemplate,
  createEmployeeExport,
  generateExcelBuffer
} = require('../utils/excelUtils');

class EmployeeImportService {
  constructor(employeeRepository, validationService, employeeService) {
    this.employeeRepository = employeeRepository;
    this.validationService = validationService;
    this.employeeService = employeeService;
  }

  /**
   * Import employees from Excel file
   * @param {string} filePath - Path to Excel file
   * @param {Object} context - Request context
   * @returns {Object} - Import result
   */
  async importEmployees(filePath, context = {}) {
    try {
      console.log('[IMPORT] Starting employee import from:', filePath);

      // Read and validate Excel file structure
      const excelData = readExcelFile(filePath);
      const structureValidation = validateExcelStructure(excelData, RequiredFields.import);
      
      if (!structureValidation.isValid) {
        return {
          success: false,
          message: 'Excel file structure validation failed',
          errors: structureValidation.errors,
          imported: 0
        };
      }

      console.log(`[IMPORT] Excel file loaded with ${excelData.rowCount} rows`);

      // Process Excel rows
      const processedEmployees = [];
      const processingErrors = [];

      for (let i = 0; i < excelData.data.length; i++) {
        const row = excelData.data[i];
        
        try {
          // Process row using column mappings
          const processedRow = processExcelRow(row, structureValidation.columnMapping);
          
          // Process date fields
          const withDates = processDateFields(processedRow);
          
          // Convert to employee format
          const employeeData = await this.convertExcelRowToEmployee(withDates, context);
          
          // Validate employee data
          const validation = this.validationService.validateForImport(employeeData, i);
          if (!validation.isValid) {
            processingErrors.push(...validation.errors);
            continue;
          }

          processedEmployees.push(this.formatEmployeeForInsert(employeeData));
          
        } catch (error) {
          console.error(`[IMPORT] Error processing row ${i + 1}:`, error);
          processingErrors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (processedEmployees.length === 0) {
        return {
          success: false,
          message: 'No valid employees to import',
          errors: processingErrors,
          imported: 0
        };
      }

      console.log(`[IMPORT] Processed ${processedEmployees.length} valid employees`);

      // Bulk insert employees
      const insertResult = await this.employeeRepository.bulkInsert(processedEmployees);
      
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log(`[IMPORT] Import completed: ${insertResult.insertedCount} employees`);

      return {
        success: true,
        message: `${insertResult.insertedCount} employees imported successfully`,
        imported: insertResult.insertedCount,
        errors: processingErrors,
        warnings: []
      };

    } catch (error) {
      console.error('[IMPORT] Import failed:', error);
      
      // Clean up file on error
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: false,
        message: `Import failed: ${error.message}`,
        errors: [error.message],
        imported: 0
      };
    }
  }

  /**
   * Import secondary employee data (for existing employees)
   * @param {string} filePath - Path to Excel file
   * @param {Object} context - Request context
   * @returns {Object} - Import result
   */
  async importSecondaryEmployeeData(filePath, context = {}) {
    try {
      console.log('[SEC IMPORT] Starting secondary data import from:', filePath);

      // Read Excel file
      const excelData = readExcelFile(filePath);
      if (!excelData.success) {
        return {
          success: false,
          message: 'Failed to read Excel file',
          errors: [excelData.error],
          updated: 0
        };
      }

      let updated = 0;
      const errors = [];
      const warnings = [];

      for (let i = 0; i < excelData.data.length; i++) {
        const row = excelData.data[i];
        
        try {
          const employeeId = row['Employee ID'];
          if (!employeeId) {
            errors.push(`Row ${i + 1}: Missing Employee ID`);
            continue;
          }

          // Build update fields
          const updateFields = this.buildSecondaryUpdateFields(row);
          
          if (Object.keys(updateFields).length === 0) {
            warnings.push(`Row ${i + 1}: No secondary fields to update for Employee ID ${employeeId}`);
            continue;
          }

          // Update employee
          const updateResult = await this.employeeRepository.updateFields(employeeId, updateFields);
          
          if (updateResult) {
            updated++;
            console.log(`[SEC IMPORT] Updated employee ${employeeId} with secondary data`);
          } else {
            errors.push(`Row ${i + 1}: Employee not found - ${employeeId}`);
          }

        } catch (error) {
          console.error(`[SEC IMPORT] Error processing row ${i + 1}:`, error);
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log(`[SEC IMPORT] Secondary import completed: ${updated} employees updated`);

      return {
        success: true,
        message: `${updated} employees updated with secondary data. ${errors.length > 0 ? errors.join('; ') : 'No errors.'}`,
        updated,
        errors,
        warnings
      };

    } catch (error) {
      console.error('[SEC IMPORT] Secondary import failed:', error);
      
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: false,
        message: `Secondary import failed: ${error.message}`,
        errors: [error.message],
        updated: 0
      };
    }
  }

  /**
   * Export employees template
   * @param {Object} context - Request context
   * @returns {Buffer} - Excel file buffer
   */
  async exportEmployeesTemplate(context = {}) {
    try {
      // Get reference data for template
      const referenceData = await this.getReferenceDataForTemplate(context.db);
      
      // Create template data
      const templateData = [{
        // Basic Info (Required fields first)
        'Employee ID': '999', // Placeholder for new employee ID
        'First Name': 'John',
        'Last Name': 'Smith', 
        'Nationality': 'Indian',
        'Email': 'john.smith@example.com',
        
        // Employment Info (Required)
        'Office ID': 19,
        'Position ID': 21,
        'Salary': 4000,
        'Joining Date': formatDateForTemplate('2023-01-01'),
        'Status': 'active',
        
        // Personal Info
        'DOB': formatDateForTemplate('1990-01-15'),
        'Gender': 'Male',
        'Phone': '+971501234567',
        'WhatsApp': '+971507891234',
        'Marital Status': 'Single',
        'Primary Language': 'English',
        'Secondary Language': 'Arabic',
        
        // Documents & Visa
        'Passport Number': 'P1234567',
        'Passport Expiry': formatDateForTemplate('2030-01-01'),
        'Visa Type': 1,
        'Visa Expiry': formatDateForTemplate('2030-12-31'),
        'Hiring Source': 'Job Portal',
        
        // Emergency Contact
        'Emergency Contact Relation': 'Father +971509876543',
        
        // Address Information
        'Current Address': '456 Current Street, Dubai',
        
        // Work & Platform
        'Platform': 1,
        
        // Additional Information
        'Salary Currency': 'AED',
      }];

      // Create Excel workbook
      const wb = createEmployeeTemplate(templateData, referenceData);
      
      return generateExcelBuffer(wb);

    } catch (error) {
      console.error('Error creating employee template:', error);
      throw new Error(`Failed to create employee template: ${error.message}`);
    }
  }

  /**
   * Export employees to Excel
   * @param {Object} filter - Filter options
   * @param {Object} context - Request context
   * @returns {Buffer} - Excel file buffer
   */
  async exportEmployees(filter = {}, context = {}) {
    try {
      console.log('[EXPORT] Starting employee export');

      // Get employees data
      const employees = await this.employeeService.getAllEmployees(filter, context);
      
      // Format data for export
      const exportData = employees.map(emp => ({
        'Employee ID': emp.employeeId,
        'First Name': emp.first_name || '',
        'Last Name': emp.last_name || '',
        'Date of Birth': emp.dob,
        'Date of Joining': emp.joiningDate,
        'Nationality': emp.nationality || '',
        'Passport Number': emp.passport_number || '',
        'Passport Expiry': emp.passport_expiry,
        'Visa Type': emp.visa_type_name || emp.visa_type || '',
        'Visa Expiry': emp.visa_expiry,
        'Office': emp.office_name || '',
        'Platform': emp.platform || '',
        'Position': emp.position_title || '',
        'Monthly Salary': emp.monthlySalary || 0,
        'Email': emp.email || '',
        'Phone': emp.phone || '',
        'WhatsApp': emp.whatsapp || '',
        'Gender': emp.gender || '',
        'Marital Status': emp.marital_status || '',
        'Primary Language': emp.primary_language || '',
        'Secondary Language': emp.secondary_language || '',
        'Hiring Source': emp.hiring_source || '',
        'Current Address': emp.current_address || '',
        'Emergency Contact Relation': emp.emergency_contact_relation || '',
        'Status': emp.status ? 'Active' : 'Inactive'
      }));

      console.log(`[EXPORT] Exporting ${exportData.length} employees`);

      // Create Excel workbook with formatting
      const wb = createEmployeeExport(exportData, { enableFormatting: true });
      
      return generateExcelBuffer(wb);

    } catch (error) {
      console.error('Error exporting employees:', error);
      throw new Error(`Failed to export employees: ${error.message}`);
    }
  }

  /**
   * Convert Excel row to employee format
   * @private
   * @param {Object} row - Processed Excel row
   * @param {Object} context - Request context
   * @returns {Object} - Employee data
   */
  async convertExcelRowToEmployee(row, context) {
    try {
      // Convert office and position names to IDs
      let office_id, position_id;
      
      if (row.office_name) {
        office_id = await this.resolveOfficeNameToId(row.office_name, context.db);
      }
      
      if (row.position_name) {
        position_id = await this.resolvePositionNameToId(row.position_name, context.db);
      }

      // Convert status
      const status = typeof row.status === 'string' ? 
        (row.status.toLowerCase() === 'active' ? 1 : 0) : 
        row.status;

      // Build employee data
      const employeeData = {
        employeeId: row.employeeId,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || null,
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        nationality: row.nationality || null,
        email: row.email,
        office_id,
        position_id,
        monthlySalary: parseFloat(row.monthlySalary) || 0,
        joiningDate: row.joiningDate,
        status: status,
        
        // Secondary fields
        dob: row.dob || null,
        passport_number: row.passport_number || null,
        passport_expiry: row.passport_expiry || null,
        visa_type: row.visa_type || null,
        visa_expiry: row.visa_expiry || null,
        platform: row.platform || null,
        address: row.address || null,
        current_address: row.current_address || null,
        phone: row.phone || null,
        whatsapp: row.whatsapp || null,
        gender: row.gender || null,
        primary_language: row.primary_language || null,
        secondary_language: row.secondary_language || null,
        marital_status: row.marital_status || null,
        hiring_source: row.hiring_source || null,
        salary_currency: row.salary_currency || 'AED',
        emirates_id: row.emirates_id || null,
        emergency_contact: row.emergency_contact || null,
        emergency_contact_relation: row.emergency_contact_relation || null,
        shift_timings: null // Will be computed automatically
      };

      return employeeData;
    } catch (error) {
      console.error('Error converting Excel row:', error);
      throw new Error(`Failed to convert Excel row: ${error.message}`);
    }
  }

  /**
   * Format employee data for database insert
   * @private
   * @param {Object} employeeData - Employee data
   * @returns {Array} - Array of values for bulk insert
   */
  formatEmployeeForInsert(employeeData) {
    return [
      employeeData.employeeId,
      employeeData.name,
      employeeData.first_name,
      employeeData.last_name,
      employeeData.nationality,
      employeeData.email,
      employeeData.office_id,
      employeeData.position_id,
      employeeData.monthlySalary,
      employeeData.joiningDate,
      employeeData.status,
      employeeData.dob,
      employeeData.passport_number,
      employeeData.passport_expiry,
      employeeData.visa_type,
      employeeData.visa_expiry,
      employeeData.platform,
      employeeData.address,
      employeeData.current_address,
      employeeData.phone,
      employeeData.whatsapp,
      employeeData.gender,
      employeeData.primary_language,
      employeeData.secondary_language,
      employeeData.marital_status,
      employeeData.hiring_source,
      employeeData.salary_currency,
      employeeData.emirates_id,
      employeeData.emergency_contact,
      employeeData.emergency_contact_relation,
      employeeData.shift_timings
    ];
  }

  /**
   * Build update fields for secondary import
   * @private
   * @param {Object} row - Excel row
   * @returns {Object} - Update fields
   */
  buildSecondaryUpdateFields(row) {
    const fields = {};
    
    // Map secondary fields
    const fieldMappings = {
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Nationality': 'nationality',
      'DOB': 'dob',
      'Phone': 'phone',
      'WhatsApp': 'whatsapp',
      'Gender': 'gender',
      'Marital Status': 'marital_status',
      'Primary Language': 'primary_language',
      'Secondary Language': 'secondary_language',
      'Passport Number': 'passport_number',
      'Passport Expiry': 'passport_expiry',
      'Visa Type': 'visa_type',
      'Visa Expiry': 'visa_expiry',
      'Hiring Source': 'hiring_source',
      'Emergency Contact Relation': 'emergency_contact_relation',
      'Current Address': 'current_address',
      'Address': 'address',
      'Platform': 'platform',
      'Salary Currency': 'salary_currency',
      'Emirates ID': 'emirates_id'
    };

    Object.keys(fieldMappings).forEach(excelField => {
      if (excelField in row && row[excelField] !== undefined && row[excelField] !== null) {
        const dbField = fieldMappings[excelField];
        fields[dbField] = row[excelField] || null;
      }
    });

    return fields;
  }

  /**
   * Get reference data for template
   * @private
   * @param {Object} db - Database connection
   * @returns {Object} - Reference data
   */
  async getReferenceDataForTemplate(db) {
    try {
      if (!db) return {};

      const [offices, positions, visaTypes, platforms] = await Promise.all([
        db.query('SELECT id, name FROM offices').then(([rows]) => rows),
        db.query('SELECT id, title FROM positions').then(([rows]) => rows),
        db.query('SELECT id, typeofvisa FROM visa_types').then(([rows]) => rows),
        db.query('SELECT id, platform_name FROM platforms').then(([rows]) => rows)
      ]);

      return { offices, positions, visaTypes, platforms };
    } catch (error) {
      console.warn('Failed to get reference data for template:', error);
      return {};
    }
  }

  /**
   * Resolve office name to ID
   * @private
   */
  async resolveOfficeNameToId(officeName, db) {
    if (!db) throw new Error('Database connection required');
    
    const [office] = await db.query('SELECT id FROM offices WHERE name = ?', [officeName]);
    if (!office || !office[0]) {
      throw new Error(`Office not found: ${officeName}`);
    }
    
    return office[0].id;
  }

  /**
   * Resolve position name to ID
   * @private
   */
  async resolvePositionNameToId(positionName, db) {
    if (!db) throw new Error('Database connection required');
    
    const [position] = await db.query('SELECT id FROM positions WHERE title = ?', [positionName]);
    if (!position || !position[0]) {
      throw new Error(`Position not found: ${positionName}`);
    }
    
    return position[0].id;
  }
}

module.exports = EmployeeImportService;
