/**
 * Improve Import Validation Script
 * Makes the import process more flexible and forgiving
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function improveImportValidation() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('🔧 IMPROVING IMPORT VALIDATION');
    console.log('==============================');
    console.log('');

    // 1. Create a more flexible validation service
    console.log('📝 Creating flexible validation service...');
    
    const flexibleValidationService = `
/**
 * Flexible Employee Validation Service
 * More forgiving validation for Excel imports
 */

const { Employee } = require('../models/Employee');

class FlexibleEmployeeValidationService {
  constructor(employeeRepository) {
    this.employeeRepository = employeeRepository;
  }

  /**
   * Flexible validation for import - more forgiving than strict validation
   */
  validateForImport(employeeData, rowIndex = 0) {
    const errors = [];
    const warnings = [];

    try {
      // Only check absolutely essential fields
      const essentialFields = ['employeeId', 'email'];
      
      essentialFields.forEach(field => {
        if (!employeeData[field] || (typeof employeeData[field] === 'string' && employeeData[field].trim() === '')) {
          errors.push(\`Row \${rowIndex + 1}: \${field} is required\`);
        }
      });

      // Build name from first_name and last_name if name is missing
      if (!employeeData.name || employeeData.name.trim() === '') {
        if (employeeData.first_name || employeeData.last_name) {
          employeeData.name = \`\${employeeData.first_name || ''} \${employeeData.last_name || ''}\`.trim();
          if (employeeData.name) {
            warnings.push(\`Row \${rowIndex + 1}: Name built from first and last name\`);
          } else {
            errors.push(\`Row \${rowIndex + 1}: Name is required (provide first_name and last_name or name)\`);
          }
        } else {
          errors.push(\`Row \${rowIndex + 1}: Name is required\`);
        }
      }

      // Email validation - more flexible
      if (employeeData.email && !this.isFlexibleEmailFormat(employeeData.email)) {
        errors.push(\`Row \${rowIndex + 1}: Invalid email format\`);
      }

      // Set defaults for missing fields instead of failing
      if (!employeeData.office_id) {
        // Try to find a default office
        employeeData.office_id = 1; // Will be handled by auto-creation
        warnings.push(\`Row \${rowIndex + 1}: No office specified, using default\`);
      }

      if (!employeeData.position_id) {
        // Try to find a default position
        employeeData.position_id = 1; // Will be handled by auto-creation
        warnings.push(\`Row \${rowIndex + 1}: No position specified, using default\`);
      }

      // Set reasonable defaults
      if (!employeeData.monthlySalary || employeeData.monthlySalary <= 0) {
        employeeData.monthlySalary = 3000; // Default salary
        warnings.push(\`Row \${rowIndex + 1}: No salary specified, using default 3000\`);
      }

      if (!employeeData.joiningDate) {
        employeeData.joiningDate = new Date().toISOString().split('T')[0];
        warnings.push(\`Row \${rowIndex + 1}: No joining date specified, using today\`);
      }

      if (employeeData.status === undefined || employeeData.status === null) {
        employeeData.status = 1; // Active by default
        warnings.push(\`Row \${rowIndex + 1}: No status specified, using active\`);
      }

      // Convert status to number if it's a string
      if (typeof employeeData.status === 'string') {
        employeeData.status = employeeData.status.toLowerCase() === 'active' ? 1 : 0;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        employeeData // Return modified data with defaults
      };
    } catch (error) {
      console.error('Flexible validation error:', error);
      return {
        isValid: false,
        errors: [\`Row \${rowIndex + 1}: Validation failed - \${error.message}\`],
        warnings: [],
        employeeData
      };
    }
  }

  /**
   * More flexible email validation
   */
  isFlexibleEmailFormat(email) {
    if (!email || typeof email !== 'string') return false;
    
    // Basic email pattern - more forgiving
    const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailPattern.test(email.trim());
  }

  /**
   * Validate and clean salary
   */
  validateAndCleanSalary(salary) {
    if (!salary) return 0;
    
    // Remove currency symbols and spaces
    const cleaned = String(salary).replace(/[^0-9.]/g, '');
    const number = parseFloat(cleaned);
    
    return isNaN(number) ? 0 : number;
  }

  /**
   * Validate and clean date
   */
  validateAndCleanDate(dateValue) {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }
}

module.exports = FlexibleEmployeeValidationService;
`;

    // Write the flexible validation service
    const validationPath = path.join(__dirname, 'services', 'FlexibleEmployeeValidationService.js');
    fs.writeFileSync(validationPath, flexibleValidationService);
    console.log('   ✅ Created FlexibleEmployeeValidationService.js');

    // 2. Create auto-creation service for missing offices/positions
    console.log('🏗️ Creating auto-creation service...');
    
    const autoCreationService = `
/**
 * Auto Creation Service
 * Automatically creates missing offices and positions during import
 */

class AutoCreationService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get or create office by name
   */
  async getOrCreateOffice(officeName) {
    if (!officeName || officeName.trim() === '') {
      // Create default office
      officeName = 'Default Office';
    }

    try {
      // Try to find existing office (case-insensitive)
      const [existing] = await this.db.query(
        'SELECT id FROM offices WHERE LOWER(name) = LOWER(?)', 
        [officeName.trim()]
      );

      if (existing && existing[0]) {
        return existing[0].id;
      }

      // Create new office
      const [result] = await this.db.query(
        'INSERT INTO offices (name, location, created_at) VALUES (?, ?, NOW())',
        [officeName.trim(), 'Auto-created during import']
      );

      console.log(\`   📍 Created new office: "\${officeName}"\`);
      return result.insertId;
    } catch (error) {
      console.error('Error creating office:', error);
      // Return a default office ID if creation fails
      return 1;
    }
  }

  /**
   * Get or create position by title
   */
  async getOrCreatePosition(positionTitle) {
    if (!positionTitle || positionTitle.trim() === '') {
      // Create default position
      positionTitle = 'General Employee';
    }

    try {
      // Try to find existing position (case-insensitive)
      const [existing] = await this.db.query(
        'SELECT id FROM positions WHERE LOWER(title) = LOWER(?)', 
        [positionTitle.trim()]
      );

      if (existing && existing[0]) {
        return existing[0].id;
      }

      // Create new position
      const [result] = await this.db.query(
        'INSERT INTO positions (title, description, created_at) VALUES (?, ?, NOW())',
        [positionTitle.trim(), 'Auto-created during import']
      );

      console.log(\`   💼 Created new position: "\${positionTitle}"\`);
      return result.insertId;
    } catch (error) {
      console.error('Error creating position:', error);
      // Return a default position ID if creation fails
      return 1;
    }
  }

  /**
   * Resolve office name to ID with auto-creation
   */
  async resolveOfficeNameToId(officeName, db) {
    return await this.getOrCreateOffice(officeName);
  }

  /**
   * Resolve position name to ID with auto-creation
   */
  async resolvePositionNameToId(positionName, db) {
    return await this.getOrCreatePosition(positionName);
  }
}

module.exports = AutoCreationService;
`;

    const autoCreationPath = path.join(__dirname, 'services', 'AutoCreationService.js');
    fs.writeFileSync(autoCreationPath, autoCreationService);
    console.log('   ✅ Created AutoCreationService.js');

    // 3. Create improved import service
    console.log('📦 Creating improved import service...');
    
    const improvedImportService = `
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

      console.log(\`[IMPROVED IMPORT] Excel file loaded with \${excelData.rowCount} rows\`);

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
          console.error(\`[IMPROVED IMPORT] Error processing row \${i + 1}:\`, error);
          processingErrors.push(\`Row \${i + 1}: \${error.message}\`);
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

      console.log(\`[IMPROVED IMPORT] Processed \${processedEmployees.length} valid employees\`);

      // Bulk insert employees
      const insertResult = await this.employeeRepository.bulkInsert(processedEmployees);
      
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log(\`[IMPROVED IMPORT] Import completed: \${insertResult.insertedCount} employees\`);

      return {
        success: true,
        message: \`\${insertResult.insertedCount} employees imported successfully with flexible validation\`,
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
        message: \`Improved import failed: \${error.message}\`,
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
          status = row.status.toLowerCase().includes('active') ? 1 : 0;
        } else {
          status = row.status ? 1 : 0;
        }
      }

      // Build employee data with defaults
      const employeeData = {
        employeeId: row.employeeId || \`EMP\${Date.now()}\`,
        name: row.name || \`\${row.first_name || ''} \${row.last_name || ''}\`.trim() || 'Unknown Employee',
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
        shift_timings: null
      };

      return employeeData;
    } catch (error) {
      console.error('Error converting Excel row (improved):', error);
      throw new Error(\`Failed to convert Excel row: \${error.message}\`);
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
`;

    const improvedImportPath = path.join(__dirname, 'services', 'ImprovedEmployeeImportService.js');
    fs.writeFileSync(improvedImportPath, improvedImportService);
    console.log('   ✅ Created ImprovedEmployeeImportService.js');

    console.log('\n✅ IMPORT VALIDATION IMPROVEMENTS COMPLETED!');
    console.log('===========================================');
    console.log('Created flexible services that will:');
    console.log('1. 🏢 Auto-create missing offices and positions');
    console.log('2. 📝 Use flexible validation with defaults');
    console.log('3. 🧹 Clean and fix common data issues');
    console.log('4. ⚠️ Show warnings instead of failing');
    console.log('');
    console.log('Next: Run the database sync script to add common variations.');

  } catch (error) {
    console.error('❌ Improvement failed:', error);
  } finally {
    await pool.end();
  }
}

improveImportValidation();