/**
 * Duplicate Detection Script
 * 
 * This script analyzes the Excel file to identify duplicate Employee IDs and other key fields
 * that could cause import failures. It provides detailed reporting and cleanup options.
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Analyze duplicates in Excel file
 * @param {string} filePath - Path to Excel file
 * @returns {object} - Analysis results
 */
function analyzeDuplicates(filePath) {
    console.log(`📊 Analyzing duplicates in: ${filePath}`);
    
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
        duplicates: {
            employeeId: new Map(),
            email: new Map(),
            phone: new Map(),
            combination: new Map() // firstname + lastname + dob combinations
        },
        duplicateCount: {
            employeeId: 0,
            email: 0,
            phone: 0,
            combination: 0
        },
        validRows: 0,
        duplicateRows: new Set(),
        reportData: []
    };

    // Track seen values
    const seen = {
        employeeId: new Map(),
        email: new Map(),
        phone: new Map(),
        combination: new Map()
    };

    data.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (accounting for header)
        
        // Get values from row (handle different column name variations)
        const employeeId = row['Employee ID'] || row['EmployeeID'] || row['employee_id'] || row['ID'];
        const email = (row.Email || row.email || row.EMAIL || '').toString().trim().toLowerCase();
        const phone = (row.Phone || row.phone || row.PHONE || row['Phone Number'] || '').toString().trim();
        const firstName = (row['First Name'] || row.FirstName || row.first_name || row.Name || '').toString().trim().toLowerCase();
        const lastName = (row['Last Name'] || row.LastName || row.last_name || '').toString().trim().toLowerCase();
        const dob = (row.DOB || row.DateOfBirth || row.dob || row['Date of Birth'] || '').toString().trim();
        
        // Create combination key for name+dob duplicates
        const combinationKey = `${firstName}|${lastName}|${dob}`;

        const rowReport = {
            row: rowNum,
            employeeId,
            email,
            phone,
            firstName,
            lastName,
            dob,
            duplicateIssues: []
        };

        // Check Employee ID duplicates
        if (employeeId) {
            const empIdKey = employeeId.toString().trim();
            if (seen.employeeId.has(empIdKey)) {
                results.duplicateCount.employeeId++;
                results.duplicateRows.add(rowNum);
                
                if (results.duplicates.employeeId.has(empIdKey)) {
                    results.duplicates.employeeId.get(empIdKey).push(rowNum);
                } else {
                    results.duplicates.employeeId.set(empIdKey, [seen.employeeId.get(empIdKey), rowNum]);
                }
                
                rowReport.duplicateIssues.push(`Duplicate Employee ID: ${empIdKey}`);
            } else {
                seen.employeeId.set(empIdKey, rowNum);
            }
        }

        // Check Email duplicates
        if (email && email !== '') {
            if (seen.email.has(email)) {
                results.duplicateCount.email++;
                results.duplicateRows.add(rowNum);
                
                if (results.duplicates.email.has(email)) {
                    results.duplicates.email.get(email).push(rowNum);
                } else {
                    results.duplicates.email.set(email, [seen.email.get(email), rowNum]);
                }
                
                rowReport.duplicateIssues.push(`Duplicate Email: ${email}`);
            } else {
                seen.email.set(email, rowNum);
            }
        }

        // Check Phone duplicates
        if (phone && phone !== '' && phone !== '0' && phone.length > 5) {
            // Normalize phone number (remove spaces, dashes, parentheses)
            const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (seen.phone.has(normalizedPhone)) {
                results.duplicateCount.phone++;
                results.duplicateRows.add(rowNum);
                
                if (results.duplicates.phone.has(normalizedPhone)) {
                    results.duplicates.phone.get(normalizedPhone).push(rowNum);
                } else {
                    results.duplicates.phone.set(normalizedPhone, [seen.phone.get(normalizedPhone), rowNum]);
                }
                
                rowReport.duplicateIssues.push(`Duplicate Phone: ${normalizedPhone}`);
            } else {
                seen.phone.set(normalizedPhone, rowNum);
            }
        }

        // Check Name+DOB combination duplicates
        if (firstName && lastName && dob && firstName !== '' && lastName !== '' && dob !== '') {
            if (seen.combination.has(combinationKey)) {
                results.duplicateCount.combination++;
                results.duplicateRows.add(rowNum);
                
                if (results.duplicates.combination.has(combinationKey)) {
                    results.duplicates.combination.get(combinationKey).push(rowNum);
                } else {
                    results.duplicates.combination.set(combinationKey, [seen.combination.get(combinationKey), rowNum]);
                }
                
                rowReport.duplicateIssues.push(`Duplicate Name+DOB: ${firstName} ${lastName} (${dob})`);
            } else {
                seen.combination.set(combinationKey, rowNum);
            }
        }

        if (rowReport.duplicateIssues.length === 0) {
            results.validRows++;
        }

        results.reportData.push(rowReport);
    });

    return results;
}

/**
 * Generate detailed report from duplicate analysis results
 * @param {object} results - Analysis results
 */
function generateReport(results) {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 DUPLICATE DETECTION REPORT');
    console.log('='.repeat(70));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total rows: ${results.totalRows}`);
    console.log(`   Valid rows (no duplicates): ${results.validRows}`);
    console.log(`   Rows with duplicate issues: ${results.duplicateRows.size}`);
    console.log(`   Employee ID duplicates: ${results.duplicateCount.employeeId}`);
    console.log(`   Email duplicates: ${results.duplicateCount.email}`);
    console.log(`   Phone duplicates: ${results.duplicateCount.phone}`);
    console.log(`   Name+DOB duplicates: ${results.duplicateCount.combination}`);

    // Employee ID duplicates
    if (results.duplicates.employeeId.size > 0) {
        console.log(`\n🆔 EMPLOYEE ID DUPLICATES:`);
        results.duplicates.employeeId.forEach((rows, empId) => {
            console.log(`   Employee ID "${empId}" appears in rows: ${rows.join(', ')}`);
        });
    }

    // Email duplicates
    if (results.duplicates.email.size > 0) {
        console.log(`\n📧 EMAIL DUPLICATES:`);
        results.duplicates.email.forEach((rows, email) => {
            console.log(`   Email "${email}" appears in rows: ${rows.join(', ')}`);
        });
    }

    // Phone duplicates
    if (results.duplicates.phone.size > 0) {
        console.log(`\n📱 PHONE DUPLICATES:`);
        results.duplicates.phone.forEach((rows, phone) => {
            console.log(`   Phone "${phone}" appears in rows: ${rows.join(', ')}`);
        });
    }

    // Name+DOB duplicates
    if (results.duplicates.combination.size > 0) {
        console.log(`\n👥 NAME + DOB DUPLICATES:`);
        results.duplicates.combination.forEach((rows, combo) => {
            const [firstName, lastName, dob] = combo.split('|');
            console.log(`   "${firstName} ${lastName}" (DOB: ${dob}) appears in rows: ${rows.join(', ')}`);
        });
    }

    // Show detailed row-by-row issues (first 15)
    const rowsWithIssues = results.reportData.filter(row => row.duplicateIssues.length > 0);
    if (rowsWithIssues.length > 0) {
        console.log(`\n❌ DETAILED DUPLICATE ISSUES (first 15):`);
        rowsWithIssues.slice(0, 15).forEach(row => {
            console.log(`   Row ${row.row}: Employee ID ${row.employeeId}`);
            row.duplicateIssues.forEach(issue => {
                console.log(`      - ${issue}`);
            });
            console.log('');
        });

        if (rowsWithIssues.length > 15) {
            console.log(`   ... and ${rowsWithIssues.length - 15} more rows with duplicate issues.`);
        }
    }
}

/**
 * Create a cleaned file with duplicates marked or removed
 * @param {string} inputPath - Original Excel file path
 * @param {object} results - Analysis results
 * @param {string} strategy - 'mark' or 'remove'
 * @returns {string} - Path to cleaned file
 */
function createCleanedFile(inputPath, results, strategy = 'mark') {
    console.log(`\n🔧 Creating cleaned Excel file with strategy: ${strategy}...`);
    
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let processedData;

    if (strategy === 'remove') {
        // Remove duplicate rows (keep first occurrence)
        const seenEmployeeIds = new Set();
        processedData = data.filter((row, index) => {
            const rowNum = index + 2;
            const employeeId = (row['Employee ID'] || row['EmployeeID'] || row['employee_id'] || row['ID'] || '').toString().trim();
            
            if (!employeeId || seenEmployeeIds.has(employeeId)) {
                console.log(`   Removing duplicate row ${rowNum}: Employee ID ${employeeId}`);
                return false;
            }
            
            seenEmployeeIds.add(employeeId);
            return true;
        });
        
        console.log(`   Removed ${data.length - processedData.length} duplicate rows`);
    } else {
        // Mark duplicates with a flag column
        processedData = data.map((row, index) => {
            const rowNum = index + 2;
            const reportRow = results.reportData.find(r => r.row === rowNum);
            
            return {
                ...row,
                'DUPLICATE_FLAG': reportRow && reportRow.duplicateIssues.length > 0 ? 'DUPLICATE' : 'CLEAN',
                'DUPLICATE_ISSUES': reportRow ? reportRow.duplicateIssues.join(' | ') : ''
            };
        });
    }

    // Create new workbook with processed data
    const newWorksheet = XLSX.utils.json_to_sheet(processedData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

    // Generate output filename
    const parsedPath = path.parse(inputPath);
    const suffix = strategy === 'remove' ? 'duplicates_removed' : 'duplicates_marked';
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_${suffix}${parsedPath.ext}`);
    
    XLSX.writeFile(newWorkbook, outputPath);
    
    console.log(`✅ Processed file created: ${outputPath}`);
    console.log(`📊 Final row count: ${processedData.length}`);
    
    return outputPath;
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node detect_duplicates.js <excel_file_path> [--mark|--remove]');
        console.log('');
        console.log('Options:');
        console.log('  --mark     Create a file with duplicate rows marked with flags');
        console.log('  --remove   Create a file with duplicate rows removed (keeps first occurrence)');
        console.log('');
        console.log('Examples:');
        console.log('  node detect_duplicates.js employees.xlsx');
        console.log('  node detect_duplicates.js employees.xlsx --mark');
        console.log('  node detect_duplicates.js employees.xlsx --remove');
        return;
    }

    const filePath = args[0];
    const shouldMark = args.includes('--mark');
    const shouldRemove = args.includes('--remove');

    try {
        const results = analyzeDuplicates(filePath);
        generateReport(results);

        if (shouldMark || shouldRemove) {
            const strategy = shouldRemove ? 'remove' : 'mark';
            const cleanedPath = createCleanedFile(filePath, results, strategy);
            
            console.log(`\n💡 NEXT STEPS:`);
            if (strategy === 'remove') {
                console.log(`1. Review the cleaned file: ${cleanedPath}`);
                console.log(`2. Verify that the correct duplicates were removed`);
                console.log(`3. Use this file for import after email validation`);
            } else {
                console.log(`1. Review the marked file: ${cleanedPath}`);
                console.log(`2. Manually resolve duplicate entries based on DUPLICATE_FLAG column`);
                console.log(`3. Remove the flag columns before import`);
            }
        } else {
            console.log(`\n💡 NEXT STEPS:`);
            console.log(`1. Run with --mark to flag duplicates for manual review`);
            console.log(`2. Run with --remove to automatically remove duplicate rows`);
            console.log(`3. Choose based on whether you need manual review of duplicates`);
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
    analyzeDuplicates,
    generateReport,
    createCleanedFile
};
