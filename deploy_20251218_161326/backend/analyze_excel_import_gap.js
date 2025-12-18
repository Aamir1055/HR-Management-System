/**
 * Enhanced Excel Import Gap Analyzer
 * 
 * This script analyzes why only some rows are being imported from your Excel file
 * and provides detailed insights into what's preventing the remaining rows from being processed.
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Format Excel date serial number to readable date
 */
function formatExcelDate(dateValue) {
    try {
        if (typeof dateValue === 'string' && /^\d+$/.test(dateValue)) {
            const serialNumber = parseInt(dateValue);
            if (serialNumber > 1 && serialNumber < 100000) {
                const excelEpoch = new Date(1900, 0, 1);
                const date = new Date(excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000);
                
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                
                return `${day}/${month}/${year}`;
            }
        }
        return dateValue;
    } catch {
        return dateValue;
    }
}

/**
 * Fix email format automatically
 */
function fixEmail(email) {
    if (!email) return email;
    
    let fixed = email.toString().trim().toLowerCase();
    
    // Common fixes
    fixed = fixed.replace(/\s+/g, ''); // Remove spaces
    fixed = fixed.replace(/,,+/g, '.'); // Replace multiple commas with dot
    fixed = fixed.replace(/\.{2,}/g, '.'); // Replace multiple dots with single dot
    fixed = fixed.replace(/@+/g, '@'); // Replace multiple @ with single @
    
    // Fix missing .com
    if (fixed.includes('@') && !fixed.includes('.') && !fixed.endsWith('.com')) {
        fixed += '.com';
    }
    
    // Fix common domain typos
    fixed = fixed.replace(/@gmial\./g, '@gmail.');
    fixed = fixed.replace(/@gmai\./g, '@gmail.');
    fixed = fixed.replace(/@yahooo\./g, '@yahoo.');
    fixed = fixed.replace(/@hotmial\./g, '@hotmail.');
    
    return fixed;
}

/**
 * Validate a single row comprehensively
 */
function validateRowDetailed(row, rowNum, seenEmployeeIds, seenEmails) {
    const result = {
        row: rowNum,
        isValid: true,
        errors: [],
        warnings: [],
        fixes: [],
        data: {}
    };
    
    // Extract fields with various column name variations
    const employeeId = row['Employee ID'] || row['EmployeeID'] || row['employee_id'] || row['ID'];
    const firstName = row['First Name'] || row.FirstName || row.first_name || row.Name;
    const lastName = row['Last Name'] || row.LastName || row.last_name || '';
    const email = row.Email || row.email || row.EMAIL;
    const phone = row.Phone || row.phone || row.PHONE || row['Phone Number'];
    const office = row.Office || row.office || row.OFFICE;
    const position = row.Position || row.position || row.POSITION || row.Role || row.role;
    const salary = row['Monthly Salary'] || row.Salary || row.salary || row.SALARY;
    const status = row.Status || row.status || row.STATUS;
    const joiningDate = row['Date of Joining'] || row['Joining Date'] || row.JoiningDate;
    const dob = row['Date of Birth'] || row.DOB || row.DateOfBirth;
    
    // Store extracted data
    result.data = {
        employeeId: employeeId ? employeeId.toString().trim() : '',
        firstName: firstName ? firstName.toString().trim() : '',
        lastName: lastName ? lastName.toString().trim() : '',
        email: email ? email.toString().trim() : '',
        phone: phone ? phone.toString().trim() : '',
        office: office ? office.toString().trim() : '',
        position: position ? position.toString().trim() : '',
        salary: salary ? salary.toString() : '',
        status: status ? status.toString().trim() : '',
        joiningDate: joiningDate ? formatExcelDate(joiningDate) : '',
        dob: dob ? formatExcelDate(dob) : ''
    };
    
    // Required field validation
    if (!result.data.employeeId) {
        result.isValid = false;
        result.errors.push('Missing Employee ID');
    }
    
    if (!result.data.firstName) {
        result.isValid = false;
        result.errors.push('Missing First Name');
    }
    
    if (!result.data.email) {
        result.isValid = false;
        result.errors.push('Missing Email');
    }
    
    if (!result.data.office) {
        result.isValid = false;
        result.errors.push('Missing Office');
    }
    
    if (!result.data.position) {
        result.isValid = false;
        result.errors.push('Missing Position');
    }
    
    if (!result.data.salary) {
        result.isValid = false;
        result.errors.push('Missing Salary');
    }
    
    if (!result.data.status) {
        result.isValid = false;
        result.errors.push('Missing Status');
    }
    
    // Employee ID duplicate check
    if (result.data.employeeId) {
        if (seenEmployeeIds.has(result.data.employeeId)) {
            result.isValid = false;
            result.errors.push(`Duplicate Employee ID: ${result.data.employeeId} (first seen in row ${seenEmployeeIds.get(result.data.employeeId)})`);
        } else {
            seenEmployeeIds.set(result.data.employeeId, rowNum);
        }
    }
    
    // Email validation and duplicate check
    if (result.data.email) {
        const fixedEmail = fixEmail(result.data.email);
        if (result.data.email !== fixedEmail) {
            result.fixes.push(`Email: ${result.data.email} → ${fixedEmail}`);
        }
        
        if (!EMAIL_REGEX.test(fixedEmail)) {
            result.isValid = false;
            result.errors.push(`Invalid email format: ${fixedEmail}`);
        } else if (seenEmails.has(fixedEmail)) {
            result.isValid = false;
            result.errors.push(`Duplicate email: ${fixedEmail} (first seen in row ${seenEmails.get(fixedEmail)})`);
        } else {
            seenEmails.set(fixedEmail, rowNum);
        }
    }
    
    // Salary validation
    if (result.data.salary) {
        const salaryNum = parseFloat(result.data.salary);
        if (isNaN(salaryNum) || salaryNum <= 0) {
            result.isValid = false;
            result.errors.push(`Invalid salary: ${result.data.salary}`);
        }
    }
    
    // Status validation
    if (result.data.status) {
        const statusLower = result.data.status.toLowerCase();
        if (!['active', 'inactive'].includes(statusLower)) {
            result.isValid = false;
            result.errors.push(`Invalid status: ${result.data.status} (must be active/inactive)`);
        }
    }
    
    return result;
}

/**
 * Analyze Excel file comprehensively
 */
function analyzeExcelFile(filePath) {
    console.log(`🔍 Analyzing Excel file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📋 Total rows in Excel: ${data.length}`);
    
    const analysis = {
        totalRows: data.length,
        validRows: 0,
        invalidRows: 0,
        emptyRows: 0,
        duplicateRows: 0,
        rowDetails: [],
        issueBreakdown: {
            missingEmployeeId: 0,
            missingFirstName: 0,
            missingEmail: 0,
            missingOffice: 0,
            missingPosition: 0,
            missingSalary: 0,
            missingStatus: 0,
            invalidEmails: 0,
            duplicateEmployeeIds: 0,
            duplicateEmails: 0,
            invalidSalaries: 0,
            invalidStatuses: 0
        }
    };
    
    const seenEmployeeIds = new Map();
    const seenEmails = new Map();
    
    data.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number
        
        // Check if row is effectively empty
        const rowValues = Object.values(row).filter(val => val !== null && val !== undefined && val.toString().trim() !== '');
        if (rowValues.length === 0) {
            analysis.emptyRows++;
            return;
        }
        
        const validation = validateRowDetailed(row, rowNum, seenEmployeeIds, seenEmails);
        analysis.rowDetails.push(validation);
        
        if (validation.isValid) {
            analysis.validRows++;
        } else {
            analysis.invalidRows++;
            
            // Count specific issues
            validation.errors.forEach(error => {
                if (error.includes('Missing Employee ID')) analysis.issueBreakdown.missingEmployeeId++;
                if (error.includes('Missing First Name')) analysis.issueBreakdown.missingFirstName++;
                if (error.includes('Missing Email')) analysis.issueBreakdown.missingEmail++;
                if (error.includes('Missing Office')) analysis.issueBreakdown.missingOffice++;
                if (error.includes('Missing Position')) analysis.issueBreakdown.missingPosition++;
                if (error.includes('Missing Salary')) analysis.issueBreakdown.missingSalary++;
                if (error.includes('Missing Status')) analysis.issueBreakdown.missingStatus++;
                if (error.includes('Invalid email')) analysis.issueBreakdown.invalidEmails++;
                if (error.includes('Duplicate Employee ID')) analysis.issueBreakdown.duplicateEmployeeIds++;
                if (error.includes('Duplicate email')) analysis.issueBreakdown.duplicateEmails++;
                if (error.includes('Invalid salary')) analysis.issueBreakdown.invalidSalaries++;
                if (error.includes('Invalid status')) analysis.issueBreakdown.invalidStatuses++;
            });
        }
    });
    
    return analysis;
}

/**
 * Generate comprehensive report
 */
function generateReport(analysis) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXCEL IMPORT GAP ANALYSIS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📈 OVERVIEW:`);
    console.log(`   Total rows in Excel: ${analysis.totalRows}`);
    console.log(`   Valid rows (importable): ${analysis.validRows} (${((analysis.validRows/analysis.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Invalid rows (blocked): ${analysis.invalidRows} (${((analysis.invalidRows/analysis.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Empty rows: ${analysis.emptyRows}`);
    
    console.log(`\n🚫 WHY ROWS ARE BEING BLOCKED:`);
    console.log(`   Missing Employee ID: ${analysis.issueBreakdown.missingEmployeeId} rows`);
    console.log(`   Missing First Name: ${analysis.issueBreakdown.missingFirstName} rows`);
    console.log(`   Missing Email: ${analysis.issueBreakdown.missingEmail} rows`);
    console.log(`   Missing Office: ${analysis.issueBreakdown.missingOffice} rows`);
    console.log(`   Missing Position: ${analysis.issueBreakdown.missingPosition} rows`);
    console.log(`   Missing Salary: ${analysis.issueBreakdown.missingSalary} rows`);
    console.log(`   Missing Status: ${analysis.issueBreakdown.missingStatus} rows`);
    console.log(`   Invalid Emails: ${analysis.issueBreakdown.invalidEmails} rows`);
    console.log(`   Duplicate Employee IDs: ${analysis.issueBreakdown.duplicateEmployeeIds} rows`);
    console.log(`   Duplicate Emails: ${analysis.issueBreakdown.duplicateEmails} rows`);
    console.log(`   Invalid Salaries: ${analysis.issueBreakdown.invalidSalaries} rows`);
    console.log(`   Invalid Statuses: ${analysis.issueBreakdown.invalidStatuses} rows`);
    
    // Show sample invalid rows
    const invalidRows = analysis.rowDetails.filter(row => !row.isValid);
    if (invalidRows.length > 0) {
        console.log(`\n❌ SAMPLE INVALID ROWS (first 10):`);
        invalidRows.slice(0, 10).forEach(row => {
            console.log(`\n   Row ${row.row}:`);
            console.log(`      Employee ID: "${row.data.employeeId}"`);
            console.log(`      Name: "${row.data.firstName} ${row.data.lastName}"`);
            console.log(`      Email: "${row.data.email}"`);
            console.log(`      Office: "${row.data.office}"`);
            console.log(`      Position: "${row.data.position}"`);
            console.log(`      Salary: "${row.data.salary}"`);
            console.log(`      Status: "${row.data.status}"`);
            console.log(`      Issues: ${row.errors.join(', ')}`);
            if (row.fixes.length > 0) {
                console.log(`      Potential fixes: ${row.fixes.join(', ')}`);
            }
        });
        
        if (invalidRows.length > 10) {
            console.log(`\n   ... and ${invalidRows.length - 10} more invalid rows`);
        }
    }
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (analysis.issueBreakdown.missingEmployeeId > 0) {
        console.log(`   • Fill in missing Employee IDs for ${analysis.issueBreakdown.missingEmployeeId} rows`);
    }
    if (analysis.issueBreakdown.missingFirstName > 0) {
        console.log(`   • Fill in missing First Names for ${analysis.issueBreakdown.missingFirstName} rows`);
    }
    if (analysis.issueBreakdown.missingEmail > 0) {
        console.log(`   • Fill in missing Emails for ${analysis.issueBreakdown.missingEmail} rows`);
    }
    if (analysis.issueBreakdown.missingOffice > 0) {
        console.log(`   • Fill in missing Offices for ${analysis.issueBreakdown.missingOffice} rows`);
    }
    if (analysis.issueBreakdown.missingPosition > 0) {
        console.log(`   • Fill in missing Positions for ${analysis.issueBreakdown.missingPosition} rows`);
    }
    if (analysis.issueBreakdown.missingSalary > 0) {
        console.log(`   • Fill in missing Salaries for ${analysis.issueBreakdown.missingSalary} rows`);
    }
    if (analysis.issueBreakdown.missingStatus > 0) {
        console.log(`   • Fill in missing Status values for ${analysis.issueBreakdown.missingStatus} rows`);
    }
    if (analysis.issueBreakdown.duplicateEmployeeIds > 0) {
        console.log(`   • Fix duplicate Employee IDs for ${analysis.issueBreakdown.duplicateEmployeeIds} rows`);
    }
    if (analysis.issueBreakdown.duplicateEmails > 0) {
        console.log(`   • Fix duplicate Emails for ${analysis.issueBreakdown.duplicateEmails} rows`);
    }
    
    console.log(`\n🔧 NEXT STEPS:`);
    console.log(`1. Fix the data issues identified above in your Excel file`);
    console.log(`2. Re-run the master fix script: node master_employee_fix.js <file> --auto-fix`);
    console.log(`3. Re-attempt the import`);
    console.log(`4. Expected result: ${analysis.totalRows - analysis.emptyRows} employees imported (instead of current 231)`);
}

/**
 * Save detailed report to JSON file
 */
function saveDetailedReport(analysis, inputPath) {
    const parsedPath = path.parse(inputPath);
    const reportPath = path.join(parsedPath.dir, `${parsedPath.name}_gap_analysis.json`);
    
    const report = {
        timestamp: new Date().toISOString(),
        sourceFile: inputPath,
        analysis: analysis
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    return reportPath;
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node analyze_excel_import_gap.js <excel_file_path> [--save-report]');
        console.log('');
        console.log('Options:');
        console.log('  --save-report   Save detailed analysis to JSON file');
        console.log('');
        console.log('Examples:');
        console.log('  node analyze_excel_import_gap.js employees.xlsx');
        console.log('  node analyze_excel_import_gap.js employees.xlsx --save-report');
        return;
    }
    
    const filePath = args[0];
    const saveReport = args.includes('--save-report');
    
    try {
        const analysis = analyzeExcelFile(filePath);
        generateReport(analysis);
        
        if (saveReport) {
            saveDetailedReport(analysis, filePath);
        }
        
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
    analyzeExcelFile,
    generateReport
};
