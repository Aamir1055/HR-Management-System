/**
 * Enhanced Import with Detailed Logging
 * Shows exactly why each record fails during import
 */

const mysql = require('mysql2/promise');
const { readExcelFile, validateExcelStructure, processExcelRow, processDateFields } = require('./utils/excelUtils');
const { Employee, RequiredFields } = require('./models/Employee');
const EmployeeValidationService = require('./services/EmployeeValidationService');
const EmployeeImportService = require('./services/EmployeeImportService');
const EmployeeRepository = require('./repositories/EmployeeRepository');
require('dotenv').config();

async function enhancedImportWithLogging(filePath) {
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
    console.log('🚀 ENHANCED EMPLOYEE IMPORT WITH DETAILED LOGGING');
    console.log('=================================================');
    console.log(`📄 File: ${filePath}`);
    console.log('');

    // Read Excel file
    const excelData = readExcelFile(filePath);
    if (!excelData.success) {
      console.log('❌ Failed to read Excel file:', excelData.error);
      return;
    }

    console.log(`📊 Total rows in Excel: ${excelData.rowCount}`);

    // Validate structure
    const structureValidation = validateExcelStructure(excelData, RequiredFields.import);
    if (!structureValidation.isValid) {
      console.log('❌ Structure validation failed:');
      structureValidation.errors.forEach(error => console.log(`   ${error}`));
      return;
    }

    // Initialize services
    const employeeRepository = new EmployeeRepository(pool);
    const validationService = new EmployeeValidationService(employeeRepository);
    const importService = new EmployeeImportService(employeeRepository, validationService, null);

    // Process all rows with detailed logging
    const results = {
      total: excelData.data.length,
      valid: 0,
      invalid: 0,
      errors: {},
      validRows: [],
      invalidRows: []
    };

    console.log('\n🔍 PROCESSING ALL ROWS...');
    console.log('========================');

    for (let i = 0; i < excelData.data.length; i++) {
      const row = excelData.data[i];
      const rowNum = i + 1;
      
      try {
        // Process row
        const processedRow = processExcelRow(row, structureValidation.columnMapping);
        const withDates = processDateFields(processedRow);
        
        // Convert to employee format
        const employeeData = await importService.convertExcelRowToEmployee(withDates, { db: pool });
        
        // Validate
        const validation = validationService.validateForImport(employeeData, i);
        
        if (validation.isValid) {
          results.valid++;
          results.validRows.push(rowNum);
          
          if (results.valid <= 5) { // Show first 5 valid rows
            console.log(`✅ Row ${rowNum}: VALID (Employee ID: ${employeeData.employeeId})`);
          }
        } else {
          results.invalid++;
          results.invalidRows.push(rowNum);
          
          // Track error types
          validation.errors.forEach(error => {
            const errorType = error.replace(`Row ${rowNum}: `, '');
            results.errors[errorType] = (results.errors[errorType] || 0) + 1;
          });
          
          if (results.invalid <= 10) { // Show first 10 invalid rows
            console.log(`❌ Row ${rowNum}: INVALID`);
            validation.errors.forEach(error => {
              console.log(`   - ${error.replace(`Row ${rowNum}: `, '')}`);
            });
          }
        }
        
      } catch (error) {
        results.invalid++;
        results.invalidRows.push(rowNum);
        
        const errorType = `Processing Error: ${error.message}`;
        results.errors[errorType] = (results.errors[errorType] || 0) + 1;
        
        if (results.invalid <= 10) {
          console.log(`💥 Row ${rowNum}: PROCESSING ERROR - ${error.message}`);
        }
      }
    }

    // Summary Report
    console.log('\n📊 IMPORT ANALYSIS SUMMARY');
    console.log('==========================');
    console.log(`Total rows: ${results.total}`);
    console.log(`Valid rows (will be imported): ${results.valid}`);
    console.log(`Invalid rows (will be skipped): ${results.invalid}`);
    console.log(`Success rate: ${((results.valid / results.total) * 100).toFixed(1)}%`);
    console.log('');

    if (results.invalid > 0) {
      console.log('🚨 TOP ISSUES PREVENTING IMPORT:');
      Object.entries(results.errors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([error, count]) => {
          console.log(`   ${count}x - ${error}`);
        });
      console.log('');

      console.log('📝 INVALID ROW NUMBERS:');
      const invalidRowsStr = results.invalidRows.slice(0, 20).join(', ');
      console.log(`   ${invalidRowsStr}${results.invalidRows.length > 20 ? ` ... and ${results.invalidRows.length - 20} more` : ''}`);
      console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    
    if (results.errors['office_id is required for import']) {
      console.log('1. 🏢 Fix office names - they must match database exactly:');
      const [offices] = await pool.query('SELECT name FROM offices ORDER BY name');
      offices.slice(0, 5).forEach(office => console.log(`   - "${office.name}"`));
      console.log('');
    }
    
    if (results.errors['position_id is required for import']) {
      console.log('2. 💼 Fix position titles - they must match database exactly:');
      const [positions] = await pool.query('SELECT title FROM positions ORDER BY title LIMIT 5');
      positions.forEach(pos => console.log(`   - "${pos.title}"`));
      console.log('');
    }
    
    if (results.errors['employeeId is required for import']) {
      console.log('3. 🔢 Ensure all Employee ID fields are filled');
    }
    
    if (results.errors['email is required for import']) {
      console.log('4. 📧 Ensure all email fields are filled with valid emails');
    }
    
    if (results.errors['name is required for import']) {
      console.log('5. 👤 Ensure all First Name and Last Name fields are filled');
    }

    console.log('6. 📥 Download the sample template for correct format');
    console.log('7. 🔧 Fix the issues above and re-upload');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await pool.end();
  }
}

// Usage
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node enhanced_import_with_logging.js <excel_file_path>');
  console.log('');
  console.log('Example:');
  console.log('  node enhanced_import_with_logging.js "C:/Users/user/Downloads/employees.xlsx"');
  process.exit(1);
}

enhancedImportWithLogging(args[0]);