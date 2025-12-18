/**
 * Complete diagnostic script for employee import issues
 * This script tests each step of the import pipeline to identify failure points
 */

const path = require('path');
const mysql = require('mysql2/promise');

// Import required modules
const { readExcelFile, validateExcelStructure, processExcelRow, processDateFields } = require('./utils/excelUtils');
const { RequiredFields, EmployeeFieldMappings } = require('./models/Employee');
const EmployeeRepository = require('./repositories/EmployeeRepository');
const EmployeeValidationService = require('./services/EmployeeValidationService');
const EmployeeImportService = require('./services/EmployeeImportService');
const EmployeeService = require('./services/EmployeeService');

// Mock database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root', 
  password: '',
  database: 'payroll_db'
};

async function createMockDb() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful');
    return connection;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('📝 Using mock database for testing...');
    
    // Return a mock database object
    return {
      query: async (sql, params) => {
        console.log(`🔍 Mock DB Query: ${sql}`, params);
        
        // Mock responses based on query type
        if (sql.includes('SELECT id FROM offices')) {
          return [[{ id: 1 }]]; // Mock office found
        } else if (sql.includes('SELECT id FROM positions')) {
          return [[{ id: 1 }]]; // Mock position found
        } else if (sql.includes('INSERT INTO employees')) {
          return [{ insertedCount: 1 }]; // Mock successful insert
        }
        return [[]]; // Default empty result
      }
    };
  }
}

async function testFileStructure(filePath) {
  console.log('\n🔍 === TESTING FILE STRUCTURE ===');
  console.log(`📁 File: ${filePath}`);
  
  try {
    // Step 1: Read Excel file
    const excelData = readExcelFile(filePath);
    console.log(`📊 Read success: ${excelData.success}`);
    console.log(`📈 Row count: ${excelData.rowCount}`);
    console.log(`📋 Available columns:`, excelData.availableColumns);
    
    if (!excelData.success) {
      console.log('❌ File reading failed:', excelData.error);
      return false;
    }
    
    // Step 2: Validate structure
    const structureValidation = validateExcelStructure(excelData, RequiredFields.import);
    console.log(`✅ Structure validation: ${structureValidation.isValid}`);
    
    if (!structureValidation.isValid) {
      console.log('❌ Structure validation errors:', structureValidation.errors);
      return false;
    }
    
    console.log('✅ File structure is valid');
    console.log('🗺️  Column mapping:', structureValidation.columnMapping);
    
    return { excelData, structureValidation };
    
  } catch (error) {
    console.log('❌ File structure test failed:', error.message);
    return false;
  }
}

async function testDataProcessing(excelData, structureValidation) {
  console.log('\n🔄 === TESTING DATA PROCESSING ===');
  
  try {
    const firstRow = excelData.data[0];
    console.log('📝 Raw first row:', firstRow);
    
    // Step 1: Process Excel row
    const processedRow = processExcelRow(firstRow, structureValidation.columnMapping);
    console.log('🔧 Processed row:', processedRow);
    
    // Step 2: Process date fields
    const withDates = processDateFields(processedRow);
    console.log('📅 With processed dates:', withDates);
    
    return withDates;
    
  } catch (error) {
    console.log('❌ Data processing failed:', error.message);
    return false;
  }
}

async function testEmployeeConversion(processedRow, db) {
  console.log('\n🏭 === TESTING EMPLOYEE CONVERSION ===');
  
  try {
    const employeeRepository = new EmployeeRepository(db);
    const validationService = new EmployeeValidationService(employeeRepository);
    const employeeService = new EmployeeService(employeeRepository, validationService);
    const importService = new EmployeeImportService(employeeRepository, validationService, employeeService);
    
    const context = { db };
    
    // Convert Excel row to employee format
    const employeeData = await importService.convertExcelRowToEmployee(processedRow, context);
    console.log('👤 Converted employee data:', employeeData);
    
    return employeeData;
    
  } catch (error) {
    console.log('❌ Employee conversion failed:', error.message);
    console.log('📚 Error stack:', error.stack);
    return false;
  }
}

async function testValidation(employeeData) {
  console.log('\n✅ === TESTING VALIDATION ===');
  
  try {
    const mockRepository = {
      findById: async () => null // Mock: employee doesn't exist
    };
    const validationService = new EmployeeValidationService(mockRepository);
    
    const validation = validationService.validateForImport(employeeData, 0);
    console.log(`🔍 Validation result: ${validation.isValid}`);
    
    if (!validation.isValid) {
      console.log('❌ Validation errors:', validation.errors);
    } else {
      console.log('✅ Validation passed');
    }
    
    if (validation.warnings && validation.warnings.length > 0) {
      console.log('⚠️  Validation warnings:', validation.warnings);
    }
    
    return validation;
    
  } catch (error) {
    console.log('❌ Validation test failed:', error.message);
    return false;
  }
}

async function runDiagnostics() {
  console.log('🚀 === EMPLOYEE IMPORT DIAGNOSTICS ===');
  
  // Test with our created test file
  const testFile = './test_employee_import_names.xlsx';
  
  console.log(`🎯 Testing with file: ${testFile}`);
  
  // Step 1: Test file structure
  const structureTest = await testFileStructure(testFile);
  if (!structureTest) {
    console.log('❌ Diagnostics failed at file structure step');
    return;
  }
  
  // Step 2: Test data processing
  const processedData = await testDataProcessing(structureTest.excelData, structureTest.structureValidation);
  if (!processedData) {
    console.log('❌ Diagnostics failed at data processing step');
    return;
  }
  
  // Step 3: Test database connection
  const db = await createMockDb();
  
  // Step 4: Test employee conversion
  const employeeData = await testEmployeeConversion(processedData, db);
  if (!employeeData) {
    console.log('❌ Diagnostics failed at employee conversion step');
    return;
  }
  
  // Step 5: Test validation
  const validation = await testValidation(employeeData);
  if (!validation) {
    console.log('❌ Diagnostics failed at validation step');
    return;
  }
  
  console.log('\n🎉 === DIAGNOSTICS SUMMARY ===');
  console.log('✅ File structure: PASSED');
  console.log('✅ Data processing: PASSED');
  console.log('✅ Employee conversion: PASSED');
  console.log(`${validation.isValid ? '✅' : '❌'} Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
  
  if (validation.isValid) {
    console.log('\n🎯 === ROOT CAUSE ANALYSIS ===');
    console.log('The import pipeline works correctly with properly formatted Excel files.');
    console.log('The 400 Bad Request error is most likely caused by:');
    console.log('1. ❌ Excel files with incorrect column names/structure');
    console.log('2. ❌ Missing required fields (office_name, position_name, etc.)');
    console.log('3. ❌ Invalid data formats (dates, emails, etc.)');
    console.log('4. ❌ Database connection or office/position lookup failures');
  } else {
    console.log('\n🔧 === ISSUES FOUND ===');
    validation.errors.forEach(error => console.log(`❌ ${error}`));
  }
  
  // Close database connection if real
  if (db && db.end) {
    await db.end();
  }
}

// Test with existing uploaded files to see what's wrong
async function testExistingFiles() {
  console.log('\n📂 === TESTING EXISTING UPLOADED FILES ===');
  
  const fs = require('fs');
  const uploadDir = './uploads';
  
  try {
    const files = fs.readdirSync(uploadDir).slice(0, 5);
    
    for (const filename of files) {
      console.log(`\n📄 Testing file: ${filename}`);
      const filePath = path.join(uploadDir, filename);
      
      try {
        const excelData = readExcelFile(filePath);
        console.log(`  📊 Rows: ${excelData.rowCount}`);
        console.log(`  📋 Columns: ${excelData.availableColumns ? excelData.availableColumns.join(', ') : 'None'}`);
        
        if (excelData.success) {
          const validation = validateExcelStructure(excelData, RequiredFields.import);
          console.log(`  ${validation.isValid ? '✅' : '❌'} Valid for import: ${validation.isValid}`);
          
          if (!validation.isValid) {
            console.log(`  ❌ Reason: ${validation.errors[0]}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ Could not read uploads directory:', error.message);
  }
}

// Run diagnostics
runDiagnostics()
  .then(() => testExistingFiles())
  .then(() => {
    console.log('\n🔚 Diagnostics completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Diagnostics failed:', error);
    process.exit(1);
  });
