/**
 * Excel Import Issue Analyzer
 * Analyzes why only some records are imported from Excel files
 */

const mysql = require('mysql2/promise');
const { readExcelFile, validateExcelStructure, processExcelRow, processDateFields } = require('./utils/excelUtils');
const { Employee, RequiredFields } = require('./models/Employee');
const EmployeeValidationService = require('./services/EmployeeValidationService');
const EmployeeImportService = require('./services/EmployeeImportService');
const EmployeeRepository = require('./repositories/EmployeeRepository');
require('dotenv').config();

async function analyzeExcelImportIssues(filePath) {
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
    console.log('🔍 ANALYZING EXCEL IMPORT ISSUES');
    console.log('================================');
    console.log(`📄 File: ${filePath}`);
    console.log('');

    // Read Excel file
    console.log('📖 Reading Excel file...');
    const excelData = readExcelFile(filePath);
    
    if (!excelData.success) {
      console.log('❌ Failed to read Excel file:', excelData.error);
      return;
    }

    console.log(`✅ Excel file loaded: ${excelData.rowCount} rows`);
    console.log('');

    // Validate structure
    console.log('🏗️ Validating Excel structure...');
    const structureValidation = validateExcelStructure(excelData, RequiredFields.import);
    
    if (!structureValidation.isValid) {
      console.log('❌ Structure validation failed:');
      structureValidation.errors.forEach(error => console.log(`   - ${error}`));
      return;
    }

    console.log('✅ Excel structure is valid');
    console.log('📋 Column mappings:');
    Object.entries(structureValidation.columnMapping).forEach(([key, value]) => {
      console.log(`   ${key} → ${value}`);
    });
    console.log('');

    // Initialize services
    const employeeRepository = new EmployeeRepository(pool);
    const validationService = new EmployeeValidationService(employeeRepository);
    const importService = new EmployeeImportService(employeeRepository, validationService, null);

    // Analyze each row
    console.log('🔍 ANALYZING EACH ROW');
    console.log('=====================');
    
    let validCount = 0;
    let invalidCount = 0;
    const issuesSummary = {};

    for (let i = 0; i < Math.min(excelData.data.length, 10); i++) { // Analyze first 10 rows
      const row = excelData.data[i];
      console.log(`\n📝 Row ${i + 1}:`);
      
      try {
        // Process row
        const processedRow = processExcelRow(row, structureValidation.columnMapping);
        const withDates = processDateFields(processedRow);
        
        // Convert to employee format
        const employeeData = await importService.convertExcelRowToEmployee(withDates, { db: pool });
        
        // Validate
        const validation = validationService.validateForImport(employeeData, i);
        
        if (validation.isValid) {
          console.log('   ✅ VALID - Will be imported');
          validCount++;
        } else {
          console.log('   ❌ INVALID - Will be skipped');
          console.log('   Errors:');
          validation.errors.forEach(error => {
            console.log(`     - ${error}`);
            
            // Track issue types
            const issueType = error.split(':')[1]?.trim() || error;
            issuesSummary[issueType] = (issuesSummary[issueType] || 0) + 1;
          });
          invalidCount++;
        }
        
        if (validation.warnings.length > 0) {
          console.log('   ⚠️ Warnings:');
          validation.warnings.forEach(warning => console.log(`     - ${warning}`));
        }
        
      } catch (error) {
        console.log(`   💥 PROCESSING ERROR: ${error.message}`);
        invalidCount++;
        
        const issueType = `Processing Error: ${error.message}`;
        issuesSummary[issueType] = (issuesSummary[issueType] || 0) + 1;
      }
    }

    // Summary
    console.log('\n📊 ANALYSIS SUMMARY');
    console.log('===================');
    console.log(`Total rows analyzed: ${Math.min(excelData.data.length, 10)}`);
    console.log(`Valid rows: ${validCount}`);
    console.log(`Invalid rows: ${invalidCount}`);
    console.log('');

    if (Object.keys(issuesSummary).length > 0) {
      console.log('🚨 COMMON ISSUES FOUND:');
      Object.entries(issuesSummary)
        .sort(([,a], [,b]) => b - a)
        .forEach(([issue, count]) => {
          console.log(`   ${count}x - ${issue}`);
        });
      console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS TO FIX IMPORT ISSUES:');
    console.log('========================================');
    
    if (issuesSummary['employeeId is required for import']) {
      console.log('1. ✏️ Ensure all rows have Employee ID values');
    }
    
    if (issuesSummary['name is required for import']) {
      console.log('2. ✏️ Ensure all rows have employee names (First Name + Last Name)');
    }
    
    if (issuesSummary['email is required for import']) {
      console.log('3. ✏️ Ensure all rows have valid email addresses');
    }
    
    if (issuesSummary['office_id is required for import']) {
      console.log('4. 🏢 Ensure all Office names in Excel match exactly with offices in database');
    }
    
    if (issuesSummary['position_id is required for import']) {
      console.log('5. 💼 Ensure all Position names in Excel match exactly with positions in database');
    }
    
    if (issuesSummary['monthlySalary is required for import']) {
      console.log('6. 💰 Ensure all rows have valid salary amounts (numbers only)');
    }
    
    if (issuesSummary['joiningDate is required for import']) {
      console.log('7. 📅 Ensure all rows have valid joining dates (YYYY-MM-DD format)');
    }
    
    console.log('8. 🧹 Remove any completely empty rows from Excel');
    console.log('9. 📋 Use the sample Excel template for correct format');
    console.log('10. 🔍 Check for special characters or formatting issues in data');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await pool.end();
  }
}

// Usage
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node analyze_excel_import_issues.js <excel_file_path>');
  console.log('');
  console.log('Example:');
  console.log('  node analyze_excel_import_issues.js "C:/Users/user/Downloads/employees.xlsx"');
  process.exit(1);
}

analyzeExcelImportIssues(args[0]);