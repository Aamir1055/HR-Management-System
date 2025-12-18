
/**
 * Improved Employee Import Service
 * More flexible and forgiving import process
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
const FlexibleEmployeeValidationService = require('./FlexibleEmployeeValidationService');
const AutoCreationService = require('./AutoCreationService');

class ImprovedEmployeeImportService {
  constructor(employeeRepository, validationService, employeeService) {
    this.employeeRepository = employeeRepository;
    this.validationService = validationService;
    this.employeeService = employeeService;
  }

  /**
   * Improved import with auto-creation and flexible validation
   */
  async importEmployeesImproved(filePath, context = {}) {
    try {
      console.log('[IMPROVED IMPORT] Starting flexible employee import from:', filePath);

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

      console.log(`[IMPROVED IMPORT] Excel file loaded with ${excelData.rowCount} rows`);

      // Initialize services
      const flexibleValidation = new FlexibleEmployeeValidationService(this.employeeRepository);
      const autoCreation = new AutoCreationService(context.db);

      // Process Excel rows with improved logic
      const processedEmployees = [];
      const processingErrors = [];
      const processingWarnings = [];

      for (let i = 0; i < excelData.data.length; i++) {
        const row = excelData.data[i];
        
        try {
          // Process row using column mappings
          const processedRow = processExcelRow(row, structureValidation.columnMapping);
          
          // Process date fields
          const withDates = processDateFields(processedRow);
          
          // Convert to employee format with auto-creation
          const employeeData = await this.convertExcelRowToEmployeeImproved(withDates, context, autoCreation);
          
          // Flexible validation
          const validation = flexibleValidation.validateForImport(employeeData, i);
          
          if (!validation.isValid) {
            processingErrors.push(...validation.errors);
            continue;
          }

          // Add warnings
          processingWarnings.push(...validation.warnings);

          // Use the modified employee data from validation
          processedEmployees.push(this.formatEmployeeForInsert(validation.employeeData));
          
        } catch (error) {
          console.error(`[IMPROVED IMPORT] Error processing row ${i + 1}:`, error);
          processingErrors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (processedEmployees.length === 0) {
        return {
          success: false,
          message: 'No valid employees to import after flexible processing',
          errors: processingErrors,
          imported: 0
        };
      }

      console.log(`[IMPROVED IMPORT] Processed ${processedEmployees.length} valid employees`);

      // Bulk insert employees
      const insertResult = await this.employeeRepository.bulkInsert(processedEmployees);
      
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log(`[IMPROVED IMPORT] Import completed: ${insertResult.insertedCount} employees`);

      return {
        success: true,
        message: `${insertResult.insertedCount} employees imported successfully with flexible validation`,
        imported: insertResult.insertedCount,
        errors: processingErrors,
        warnings: processingWarnings
      };

    } catch (error) {
      console.error('[IMPROVED IMPORT] Import failed:', error);
      
      // Clean up file on error
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: false,
        message: `Improved import failed: ${error.message}`,
        errors: [error.message],
        imported: 0
      };
    }
  }

  /**
   * Convert Excel row with auto-creation support
   */
  async convertExcelRowToEmployeeImproved(row, context, autoCreation) {
    try {
      // Auto-resolve office and position with creation
      let office_id, position_id;
      
      if (row.office_name) {
        office_id = await autoCreation.getOrCreateOffice(row.office_name);
      }
      
      if (row.position_name) {
        position_id = await autoCreation.getOrCreatePosition(row.position_name);
      }

      // Clean and validate salary
      const flexibleValidation = new FlexibleEmployeeValidationService();
      const cleanSalary = flexibleValidation.validateAndCleanSalary(row.monthlySalary);
      
      // Clean and validate dates
      const cleanJoiningDate = flexibleValidation.validateAndCleanDate(row.joiningDate);
      const cleanDob = flexibleValidation.validateAndCleanDate(row.dob);
      const cleanPassportExpiry = flexibleValidation.validateAndCleanDate(row.passport_expiry);
      const cleanVisaExpiry = flexibleValidation.validateAndCleanDate(row.visa_expiry);

      // Convert status with flexibility
      let status = 1; // Default to active
      if (row.status !== undefined && row.status !== null) {
        if (typeof row.status === 'string') {
          const statusLower = row.status.trim().toLowerCase();
          status = statusLower === 'active' ? 1 : 0;
          console.log(`[IMPROVED STATUS DEBUG] Excel status: "${row.status}" → Database: ${status}`);
        } else {
          status = row.status ? 1 : 0;
        }
      }

      // Build employee data with defaults
      const employeeData = {
        employeeId: row.employeeId || `EMP${Date.now()}`,
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown Employee',
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        nationality: row.nationality || 'Not Specified',
        email: row.email,
        office_id,
        position_id,
        monthlySalary: cleanSalary || 3000,
        joiningDate: cleanJoiningDate || new Date().toISOString().split('T')[0],
        status: status,
        
        // Secondary fields with defaults
        dob: cleanDob,
        passport_number: row.passport_number || null,
        passport_expiry: cleanPassportExpiry,
        visa_type: row.visa_type || null,
        visa_expiry: cleanVisaExpiry,
        platform: row.platform || null,
        address: row.address || null,
        current_address: row.current_address || null,
        phone: row.phone || null,
        whatsapp: row.whatsapp || null,
        gender: row.gender || null,
        primary_language: row.primary_language || 'English',
        secondary_language: row.secondary_language || null,
        marital_status: row.marital_status || null,
        hiring_source: row.hiring_source || null,
        salary_currency: row.salary_currency || 'AED',
        emirates_id: row.emirates_id || null,
        emergency_contact: row.emergency_contact || null,
        emergency_contact_relation: row.emergency_contact_relation || null,
        shift_timings: row.shift_timings || null
      };

      return employeeData;
    } catch (error) {
      console.error('Error converting Excel row (improved):', error);
      throw new Error(`Failed to convert Excel row: ${error.message}`);
    }
  }

  /**
   * Format employee data for database insert
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
}

module.exports = ImprovedEmployeeImportService;
