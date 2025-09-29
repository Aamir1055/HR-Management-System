/**
 * Comprehensive Data Validation Script
 * 
 * This script performs complete validation of Excel employee data including:
 * - Email validation and cleanup
 * - Date validation and formatting (consistent DD/MM/YYYY format)
 * - Duplicate detection
 * - Required field validation
 * - Foreign key reference validation (mock)
 * 
 * Provides detailed reporting with specific row numbers and issues.
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Import date utilities
const dateUtils = require('./utils/dateUtils');

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Mock database lookups (updated with actual values from your system)
const MOCK_OFFICES = [
    'M09 - AMARI CAPITAL', 'M13 - MOIT & TK', 'M14 - Ono Creator', 'M41 - Target FX', 
    'M6 - Yashaa', 'SM14 - Amari Capital', 'SM17 - Taqniyah'
];
const MOCK_POSITIONS = [
    'Chat Agent', 'Developer', 'Director', 'Hr Associate I', 'Hr Associate II',
    'Jr. Relationship Manager I', 'Jr. Relationship Manager II', 'Marketing Associate',
    'Office Boy', 'Operations Assistant', 'Operations Manager', 'Operations Manager I',
    'Organic Agent', 'Performance Ads Specialist', 'Performance Ads Specialist I',
    'Relationship Manager', 'Relationship Manager I', 'Smm Associate',
    'Tele Sales Assistant', 'Tele Sales Assistant I', 'Transaction Auditor', 'Transaction Auditor I'
];
const MOCK_STATUSES = ['active', 'inactive', 'Active', 'Inactive'];

/**
 * Validate a single row of employee data
 * @param {object} row - Excel row data
 * @param {number} rowNum - Row number in Excel
 * @param {Map} seenEmployeeIds - Track duplicate employee IDs
 * @param {Map} seenEmails - Track duplicate emails
 * @returns {object} - Validation result
 */
function validateRow(row, rowNum, seenEmployeeIds, seenEmails) {
    const result = {
        row: rowNum,
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
    };

    // Extract fields with various column name variations
    const employeeId = row['Employee ID'] || row['EmployeeID'] || row['employee_id'] || row['ID'];
    const firstName = row['First Name'] || row.FirstName || row.first_name || row.Name;
    const lastName = row['Last Name'] || row.LastName || row.last_name || '';
    const email = row.Email || row.email || row.EMAIL;
    const phone = row.Phone || row.phone || row.PHONE || row['Phone Number'];
    const office = row.Office || row.office || row.OFFICE;
    const position = row.Position || row.position || row.POSITION || row.Role || row.role;
    const salary = row['Monthly Salary'] || row.Salary || row.salary || row.SALARY || row['monthlySalary'];
    const status = row.Status || row.status || row.STATUS;
    const joiningDate = row['Date of Joining'] || row['Joining Date'] || row.JoiningDate || row.joining_date || row['Date Joined'];
    const dob = row['Date of Birth'] || row.DOB || row.DateOfBirth || row.dob;

    // Required field validation
    if (!employeeId) {
        result.isValid = false;
        result.errors.push('Missing Employee ID');
    }

    if (!firstName || firstName.toString().trim() === '') {
        result.isValid = false;
        result.errors.push('Missing First Name');
    }

    if (!email || email.toString().trim() === '') {
        result.isValid = false;
        result.errors.push('Missing Email');
    }

    if (!office || office.toString().trim() === '') {
        result.isValid = false;
        result.errors.push('Missing Office');
    }

    if (!position || position.toString().trim() === '') {
        result.isValid = false;
        result.errors.push('Missing Position');
    }

    if (!salary) {
        result.isValid = false;
        result.errors.push('Missing Salary');
    }

    if (!status || status.toString().trim() === '') {
        result.isValid = false;
        result.errors.push('Missing Status');
    }

    // Employee ID duplicate check
    if (employeeId) {
        const empIdKey = employeeId.toString().trim();
        if (seenEmployeeIds.has(empIdKey)) {
            result.isValid = false;
            result.errors.push(`Duplicate Employee ID: ${empIdKey} (first seen in row ${seenEmployeeIds.get(empIdKey)})`);
        } else {
            seenEmployeeIds.set(empIdKey, rowNum);
        }
    }

    // Email validation and duplicate check
    if (email) {
        const emailStr = email.toString().trim().toLowerCase();
        
        if (!EMAIL_REGEX.test(emailStr)) {
            result.isValid = false;
            result.errors.push('Invalid email format');
            
            // Suggest common fixes
            if (!emailStr.includes('@')) {
                result.suggestions.push('Email missing @ symbol');
            } else if (!emailStr.includes('.')) {
                result.suggestions.push('Email missing domain extension');
            }
        } else {
            // Check for duplicates
            if (seenEmails.has(emailStr)) {
                result.isValid = false;
                result.errors.push(`Duplicate email: ${emailStr} (first seen in row ${seenEmails.get(emailStr)})`);
            } else {
                seenEmails.set(emailStr, rowNum);
            }
        }
    }

    // Office validation (against mock database)
    if (office) {
        const officeStr = office.toString().trim();
        if (!MOCK_OFFICES.includes(officeStr)) {
            result.isValid = false;
            result.errors.push(`Invalid office: ${officeStr}`);
            result.suggestions.push(`Available offices: ${MOCK_OFFICES.join(', ')}`);
        }
    }

    // Position validation (against mock database)
    if (position) {
        const positionStr = position.toString().trim();
        if (!MOCK_POSITIONS.includes(positionStr)) {
            result.isValid = false;
            result.errors.push(`Invalid position: ${positionStr}`);
            result.suggestions.push(`Available positions: ${MOCK_POSITIONS.join(', ')}`);
        }
    }

    // Salary validation
    if (salary) {
        const salaryNum = parseFloat(salary);
        if (isNaN(salaryNum) || salaryNum <= 0) {
            result.isValid = false;
            result.errors.push('Invalid salary (must be positive number)');
        } else if (salaryNum < 1000) {
            result.warnings.push('Salary seems very low (less than 1000)');
        } else if (salaryNum > 1000000) {
            result.warnings.push('Salary seems very high (greater than 1,000,000)');
        }
    }

    // Status validation
    if (status) {
        const statusStr = status.toString().trim();
        const statusLower = statusStr.toLowerCase();
        const validStatuses = MOCK_STATUSES.map(s => s.toLowerCase());
        
        if (!validStatuses.includes(statusLower)) {
            result.isValid = false;
            result.errors.push(`Invalid status: ${status}`);
            result.suggestions.push(`Valid statuses: ${MOCK_STATUSES.join(', ')}`);
        }
    }

    // Date validations
    if (joiningDate) {
        const joiningDateStr = joiningDate.toString().trim();
        if (!dateUtils.isValidDate(joiningDateStr)) {
            result.isValid = false;
            result.errors.push('Invalid joining date format');
            result.suggestions.push('Use DD/MM/YYYY format for dates');
        } else {
            // Convert to DD/MM/YYYY format if not already
            const formattedDate = formatDateToDDMMYYYY(joiningDateStr);
            if (formattedDate !== joiningDateStr) {
                result.suggestions.push(`Joining date should be formatted as: ${formattedDate}`);
            }
        }
    }

    if (dob) {
        const dobStr = dob.toString().trim();
        if (!dateUtils.isValidDate(dobStr)) {
            result.isValid = false;
            result.errors.push('Invalid date of birth format');
            result.suggestions.push('Use DD/MM/YYYY format for dates');
        } else {
            // Convert to DD/MM/YYYY format if not already
            const formattedDate = formatDateToDDMMYYYY(dobStr);
            if (formattedDate !== dobStr) {
                result.suggestions.push(`Date of birth should be formatted as: ${formattedDate}`);
            }

            // Age validation
            const age = calculateAge(dobStr);
            if (age < 16) {
                result.warnings.push('Employee age seems too young (less than 16)');
            } else if (age > 80) {
                result.warnings.push('Employee age seems too old (greater than 80)');
            }
        }
    }

    // Phone validation
    if (phone) {
        const phoneStr = phone.toString().trim();
        const phoneDigits = phoneStr.replace(/[\s\-\(\)]/g, '');
        if (phoneDigits.length < 8 || phoneDigits.length > 15) {
            result.warnings.push('Phone number length seems unusual');
        }
        if (!/^\+?[\d\s\-\(\)]+$/.test(phoneStr)) {
            result.warnings.push('Phone number contains invalid characters');
        }
    }

    return result;
}

/**
 * Format Excel date serial number to DD/MM/YYYY format
 * @param {string|number} dateValue - Date string or Excel serial number
 * @returns {string} - Formatted date
 */
function formatDateToDDMMYYYY(dateValue) {
    try {
        // If it's a number (Excel serial date), convert it
        if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
            const serialNumber = parseInt(dateValue);
            if (serialNumber > 1 && serialNumber < 100000) {
                // Convert Excel serial number to JavaScript date
                const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
                const date = new Date(excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000);
                
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                
                return `${day}/${month}/${year}`;
            }
        }
        
        // Try to parse and format using dateUtils for regular dates
        const dbFormat = dateUtils.formatDateForStorage(dateValue);
        if (dbFormat && dbFormat !== dateValue) {
            return dateUtils.formatDateForDisplay(dbFormat);
        }
        return dateValue;
    } catch {
        return dateValue;
    }
}

/**
 * Calculate age from date of birth
 * @param {string} dobStr - Date of birth string
 * @returns {number} - Age in years
 */
function calculateAge(dobStr) {
    try {
        const dbFormat = dateUtils.formatDateForStorage(dobStr);
        if (dbFormat) {
            const birthDate = new Date(dbFormat);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            return age;
        }
    } catch {
        return 0;
    }
    return 0;
}

/**
 * Perform comprehensive validation on Excel file
 * @param {string} filePath - Path to Excel file
 * @returns {object} - Comprehensive validation results
 */
function performComprehensiveValidation(filePath) {
    console.log(`📊 Performing comprehensive validation on: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Total rows found: ${data.length}`);

    const results = {
        totalRows: data.length,
        validRows: 0,
        invalidRows: 0,
        rowsWithWarnings: 0,
        validationResults: [],
        summary: {
            missingRequiredFields: 0,
            invalidEmails: 0,
            duplicateEmployeeIds: 0,
            duplicateEmails: 0,
            invalidOffices: 0,
            invalidPositions: 0,
            invalidSalaries: 0,
            invalidStatuses: 0,
            invalidDates: 0,
            phoneWarnings: 0
        }
    };

    const seenEmployeeIds = new Map();
    const seenEmails = new Map();

    data.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (accounting for header)
        const validation = validateRow(row, rowNum, seenEmployeeIds, seenEmails);
        
        results.validationResults.push(validation);

        if (validation.isValid) {
            results.validRows++;
        } else {
            results.invalidRows++;
        }

        if (validation.warnings.length > 0) {
            results.rowsWithWarnings++;
        }

        // Update summary counts
        validation.errors.forEach(error => {
            if (error.includes('Missing')) {
                results.summary.missingRequiredFields++;
            } else if (error.includes('Invalid email')) {
                results.summary.invalidEmails++;
            } else if (error.includes('Duplicate Employee ID')) {
                results.summary.duplicateEmployeeIds++;
            } else if (error.includes('Duplicate email')) {
                results.summary.duplicateEmails++;
            } else if (error.includes('Invalid office')) {
                results.summary.invalidOffices++;
            } else if (error.includes('Invalid position')) {
                results.summary.invalidPositions++;
            } else if (error.includes('Invalid salary')) {
                results.summary.invalidSalaries++;
            } else if (error.includes('Invalid status')) {
                results.summary.invalidStatuses++;
            } else if (error.includes('Invalid') && error.includes('date')) {
                results.summary.invalidDates++;
            }
        });

        validation.warnings.forEach(warning => {
            if (warning.includes('Phone')) {
                results.summary.phoneWarnings++;
            }
        });
    });

    return results;
}

/**
 * Generate comprehensive validation report
 * @param {object} results - Validation results
 */
function generateComprehensiveReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 COMPREHENSIVE DATA VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 OVERVIEW:`);
    console.log(`   Total rows: ${results.totalRows}`);
    console.log(`   Valid rows: ${results.validRows} (${((results.validRows/results.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Invalid rows: ${results.invalidRows} (${((results.invalidRows/results.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Rows with warnings: ${results.rowsWithWarnings}`);

    console.log(`\n📈 VALIDATION SUMMARY:`);
    console.log(`   Missing required fields: ${results.summary.missingRequiredFields}`);
    console.log(`   Invalid emails: ${results.summary.invalidEmails}`);
    console.log(`   Duplicate Employee IDs: ${results.summary.duplicateEmployeeIds}`);
    console.log(`   Duplicate emails: ${results.summary.duplicateEmails}`);
    console.log(`   Invalid offices: ${results.summary.invalidOffices}`);
    console.log(`   Invalid positions: ${results.summary.invalidPositions}`);
    console.log(`   Invalid salaries: ${results.summary.invalidSalaries}`);
    console.log(`   Invalid statuses: ${results.summary.invalidStatuses}`);
    console.log(`   Invalid dates: ${results.summary.invalidDates}`);
    console.log(`   Phone warnings: ${results.summary.phoneWarnings}`);

    // Show detailed issues for first 20 invalid rows
    const invalidRows = results.validationResults.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
        console.log(`\n❌ DETAILED VALIDATION ERRORS (first 20):`);
        invalidRows.slice(0, 20).forEach(row => {
            console.log(`\n   Row ${row.row}:`);
            row.errors.forEach(error => {
                console.log(`      ❌ ${error}`);
            });
            if (row.suggestions.length > 0) {
                row.suggestions.forEach(suggestion => {
                    console.log(`      💡 ${suggestion}`);
                });
            }
            if (row.warnings.length > 0) {
                row.warnings.forEach(warning => {
                    console.log(`      ⚠️  ${warning}`);
                });
            }
        });

        if (invalidRows.length > 20) {
            console.log(`\n   ... and ${invalidRows.length - 20} more rows with validation errors.`);
        }
    }

    // Show warning summary
    const warningRows = results.validationResults.filter(r => r.warnings.length > 0);
    if (warningRows.length > 0) {
        console.log(`\n⚠️  WARNINGS SUMMARY (first 10):`);
        warningRows.slice(0, 10).forEach(row => {
            console.log(`   Row ${row.row}: ${row.warnings.join(', ')}`);
        });
        
        if (warningRows.length > 10) {
            console.log(`   ... and ${warningRows.length - 10} more rows with warnings.`);
        }
    }
}

/**
 * Create a validation report file
 * @param {string} inputPath - Original Excel file path
 * @param {object} results - Validation results
 * @returns {string} - Path to report file
 */
function createValidationReport(inputPath, results) {
    console.log('\n📄 Creating detailed validation report...');
    
    const parsedPath = path.parse(inputPath);
    const reportPath = path.join(parsedPath.dir, `${parsedPath.name}_validation_report.json`);
    
    // Create detailed report
    const report = {
        timestamp: new Date().toISOString(),
        sourceFile: inputPath,
        summary: {
            totalRows: results.totalRows,
            validRows: results.validRows,
            invalidRows: results.invalidRows,
            validPercentage: ((results.validRows/results.totalRows)*100).toFixed(1),
            rowsWithWarnings: results.rowsWithWarnings
        },
        issueBreakdown: results.summary,
        detailedResults: results.validationResults.map(r => ({
            row: r.row,
            isValid: r.isValid,
            errors: r.errors,
            warnings: r.warnings,
            suggestions: r.suggestions
        }))
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Validation report created: ${reportPath}`);
    return reportPath;
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node comprehensive_validation.js <excel_file_path> [--report]');
        console.log('');
        console.log('Options:');
        console.log('  --report   Create a detailed JSON validation report file');
        console.log('');
        console.log('Examples:');
        console.log('  node comprehensive_validation.js employees.xlsx');
        console.log('  node comprehensive_validation.js employees.xlsx --report');
        return;
    }

    const filePath = args[0];
    const shouldCreateReport = args.includes('--report');

    try {
        const results = performComprehensiveValidation(filePath);
        generateComprehensiveReport(results);

        if (shouldCreateReport) {
            const reportPath = createValidationReport(filePath, results);
            console.log(`\n💡 NEXT STEPS:`);
            console.log(`1. Review the detailed report: ${reportPath}`);
            console.log(`2. Fix validation errors in the Excel file`);
            console.log(`3. Run email validation script: node validate_and_fix_emails.js ${filePath} --fix`);
            console.log(`4. Run duplicate detection script: node detect_duplicates.js ${filePath} --remove`);
            console.log(`5. Re-run this validation after fixes`);
        } else {
            console.log(`\n💡 NEXT STEPS:`);
            console.log(`1. Fix the validation errors shown above`);
            console.log(`2. Ensure all dates are in DD/MM/YYYY format`);
            console.log(`3. Use the email and duplicate scripts for targeted fixes`);
            console.log(`4. Run with --report flag for detailed JSON report`);
        }

        // Exit code based on validation results
        process.exit(results.invalidRows > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    validateRow,
    performComprehensiveValidation,
    generateComprehensiveReport,
    createValidationReport
};
