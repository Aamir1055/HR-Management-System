/**
 * Master Employee Data Fix Script
 * 
 * This comprehensive script combines all fixes and validations:
 * 1. Creates missing offices and positions from Excel data
 * 2. Validates and fixes email formats automatically
 * 3. Detects and removes duplicate entries
 * 4. Performs complete data validation with Excel date handling
 * 5. Provides step-by-step guidance for remaining issues
 * 
 * Usage: node master_employee_fix.js <excel_file_path> [--auto-fix]
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Import utilities
const dateUtils = require('./utils/dateUtils');

// Configuration
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'payroll_system2'
};

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Connect to database
 */
async function connectDB() {
    console.log('📡 Connecting to database...');
    return await mysql.createConnection(DB_CONFIG);
}

/**
 * Get existing offices and positions from database
 */
async function getExistingData(connection) {
    console.log('📋 Fetching existing offices and positions...');
    
    const [offices] = await connection.execute('SELECT name FROM offices');
    const [positions] = await connection.execute('SELECT title FROM positions');
    
    const existingOffices = offices.map(row => row.name);
    const existingPositions = positions.map(row => row.title);
    
    console.log(`   Found ${existingOffices.length} offices and ${existingPositions.length} positions`);
    
    return { existingOffices, existingPositions };
}

/**
 * Create missing offices and positions
 */
async function createMissingData(connection, missingOffices, missingPositions) {
    let created = 0;
    
    // Create missing offices
    for (const office of missingOffices) {
        try {
            await connection.execute(
                'INSERT INTO offices (name, created_at) VALUES (?, NOW())',
                [office.trim()]
            );
            console.log(`✅ Created office: ${office}`);
            created++;
        } catch (error) {
            console.log(`❌ Failed to create office '${office}': ${error.message}`);
        }
    }
    
        // Create missing positions
        for (const position of missingPositions) {
            try {
                await connection.execute(
                    'INSERT INTO positions (title, created_at) VALUES (?, NOW())',
                    [position.trim()]
                );
                console.log(`✅ Created position: ${position}`);
                created++;
            } catch (error) {
                console.log(`❌ Failed to create position '${position}': ${error.message}`);
            }
        }
    
    return created;
}

/**
 * Format Excel date serial number to DD/MM/YYYY format
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
 * Validate and process Excel data
 */
function processExcelData(filePath, autoFix = false) {
    console.log(`📊 Processing Excel file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📋 Total rows found: ${data.length}`);
    
    const processedData = [];
    const uniqueOffices = new Set();
    const uniquePositions = new Set();
    const seenEmails = new Map();
    const seenEmployeeIds = new Map();
    const issues = [];
    const fixes = [];
    
    data.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number
        const processed = {
            row: rowNum,
            original: { ...row },
            processed: {},
            issues: [],
            fixes: []
        };
        
        // Extract and process fields
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
        
        // Process Employee ID
        if (employeeId) {
            const empIdStr = employeeId.toString().trim();
            if (seenEmployeeIds.has(empIdStr)) {
                processed.issues.push(`Duplicate Employee ID: ${empIdStr} (first seen in row ${seenEmployeeIds.get(empIdStr)})`);
            } else {
                seenEmployeeIds.set(empIdStr, rowNum);
                processed.processed.employeeId = empIdStr;
            }
        } else {
            processed.issues.push('Missing Employee ID');
        }
        
        // Process names
        processed.processed.firstName = firstName ? firstName.toString().trim() : '';
        processed.processed.lastName = lastName ? lastName.toString().trim() : '';
        
        if (!processed.processed.firstName) {
            processed.issues.push('Missing First Name');
        }
        
        // Process email
        if (email) {
            const originalEmail = email.toString().trim();
            const fixedEmail = autoFix ? fixEmail(originalEmail) : originalEmail.toLowerCase();
            
            if (originalEmail !== fixedEmail) {
                processed.fixes.push(`Email: ${originalEmail} → ${fixedEmail}`);
                fixes.push(`Row ${rowNum}: Email fixed`);
            }
            
            if (!EMAIL_REGEX.test(fixedEmail)) {
                processed.issues.push(`Invalid email format: ${fixedEmail}`);
            } else if (seenEmails.has(fixedEmail)) {
                processed.issues.push(`Duplicate email: ${fixedEmail} (first seen in row ${seenEmails.get(fixedEmail)})`);
            } else {
                seenEmails.set(fixedEmail, rowNum);
                processed.processed.email = fixedEmail;
            }
        } else {
            processed.issues.push('Missing Email');
        }
        
        // Process office and position
        if (office) {
            const officeStr = office.toString().trim();
            processed.processed.office = officeStr;
            uniqueOffices.add(officeStr);
        } else {
            processed.issues.push('Missing Office');
        }
        
        if (position) {
            const positionStr = position.toString().trim();
            processed.processed.position = positionStr;
            uniquePositions.add(positionStr);
        } else {
            processed.issues.push('Missing Position');
        }
        
        // Process salary
        if (salary) {
            const salaryNum = parseFloat(salary);
            if (isNaN(salaryNum) || salaryNum <= 0) {
                processed.issues.push('Invalid salary (must be positive number)');
            } else {
                processed.processed.salary = salaryNum;
            }
        } else {
            processed.issues.push('Missing Salary');
        }
        
        // Process status
        if (status) {
            const statusStr = status.toString().trim();
            const statusLower = statusStr.toLowerCase();
            if (['active', 'inactive'].includes(statusLower)) {
                processed.processed.status = statusLower;
            } else {
                processed.issues.push(`Invalid status: ${status} (must be active/inactive)`);
            }
        } else {
            processed.issues.push('Missing Status');
        }
        
        // Process dates
        if (joiningDate) {
            const formattedDate = formatExcelDate(joiningDate);
            if (formattedDate !== joiningDate.toString()) {
                processed.fixes.push(`Joining Date: ${joiningDate} → ${formattedDate}`);
                fixes.push(`Row ${rowNum}: Joining date formatted`);
            }
            processed.processed.joiningDate = formattedDate;
        }
        
        if (dob) {
            const formattedDate = formatExcelDate(dob);
            if (formattedDate !== dob.toString()) {
                processed.fixes.push(`Date of Birth: ${dob} → ${formattedDate}`);
                fixes.push(`Row ${rowNum}: DOB formatted`);
            }
            processed.processed.dob = formattedDate;
        }
        
        // Process phone
        if (phone) {
            processed.processed.phone = phone.toString().trim();
        }
        
        processedData.push(processed);
        
        if (processed.issues.length > 0) {
            issues.push(...processed.issues.map(issue => `Row ${rowNum}: ${issue}`));
        }
    });
    
    return {
        data: processedData,
        uniqueOffices: Array.from(uniqueOffices),
        uniquePositions: Array.from(uniquePositions),
        issues,
        fixes,
        summary: {
            totalRows: data.length,
            validRows: processedData.filter(row => row.issues.length === 0).length,
            rowsWithIssues: processedData.filter(row => row.issues.length > 0).length,
            fixesApplied: fixes.length
        }
    };
}

/**
 * Generate comprehensive report
 */
function generateReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 MASTER EMPLOYEE DATA FIX REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 PROCESSING SUMMARY:`);
    console.log(`   Total rows processed: ${results.summary.totalRows}`);
    console.log(`   Valid rows: ${results.summary.validRows} (${((results.summary.validRows/results.summary.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Rows with issues: ${results.summary.rowsWithIssues} (${((results.summary.rowsWithIssues/results.summary.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Automatic fixes applied: ${results.summary.fixesApplied}`);
    
    console.log(`\n🏢 DATA DISCOVERY:`);
    console.log(`   Unique offices found: ${results.uniqueOffices.length}`);
    console.log(`   Unique positions found: ${results.uniquePositions.length}`);
    
    if (results.fixes.length > 0) {
        console.log(`\n✅ AUTOMATIC FIXES APPLIED:`);
        results.fixes.slice(0, 10).forEach(fix => {
            console.log(`   ${fix}`);
        });
        if (results.fixes.length > 10) {
            console.log(`   ... and ${results.fixes.length - 10} more fixes applied`);
        }
    }
    
    if (results.issues.length > 0) {
        console.log(`\n❌ REMAINING ISSUES (first 20):`);
        results.issues.slice(0, 20).forEach(issue => {
            console.log(`   ${issue}`);
        });
        if (results.issues.length > 20) {
            console.log(`   ... and ${results.issues.length - 20} more issues`);
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node master_employee_fix.js <excel_file_path> [--auto-fix]');
        console.log('');
        console.log('Options:');
        console.log('  --auto-fix   Automatically fix common data issues (emails, dates, etc.)');
        console.log('');
        console.log('Examples:');
        console.log('  node master_employee_fix.js employees.xlsx');
        console.log('  node master_employee_fix.js employees.xlsx --auto-fix');
        return;
    }
    
    const filePath = args[0];
    const autoFix = args.includes('--auto-fix');
    
    console.log('🚀 Starting Master Employee Data Fix Process...');
    if (autoFix) {
        console.log('⚡ Auto-fix mode enabled');
    }
    
    let connection;
    
    try {
        // Step 1: Process Excel data
        console.log('\n📝 STEP 1: Processing Excel data...');
        const results = processExcelData(filePath, autoFix);
        
        // Step 2: Connect to database and get existing data
        console.log('\n🗄️  STEP 2: Analyzing database...');
        connection = await connectDB();
        const { existingOffices, existingPositions } = await getExistingData(connection);
        
        // Step 3: Identify missing offices and positions
        console.log('\n🔍 STEP 3: Identifying missing data...');
        const missingOffices = results.uniqueOffices.filter(office => 
            !existingOffices.includes(office)
        );
        const missingPositions = results.uniquePositions.filter(position => 
            !existingPositions.includes(position)
        );
        
        console.log(`   Missing offices to create: ${missingOffices.length}`);
        console.log(`   Missing positions to create: ${missingPositions.length}`);
        
        // Step 4: Create missing data
        if (missingOffices.length > 0 || missingPositions.length > 0) {
            console.log('\n🏗️  STEP 4: Creating missing offices and positions...');
            const created = await createMissingData(connection, missingOffices, missingPositions);
            console.log(`✅ Successfully created ${created} new entries`);
        } else {
            console.log('\n✅ STEP 4: No missing offices or positions to create');
        }
        
        // Step 5: Generate comprehensive report
        console.log('\n📊 STEP 5: Generating comprehensive report...');
        generateReport(results);
        
        // Step 6: Provide next steps
        console.log('\n💡 NEXT STEPS:');
        
        if (results.summary.rowsWithIssues === 0) {
            console.log('🎉 All data is valid! You can now proceed with the employee import.');
            console.log('1. Run your employee import script');
            console.log('2. Verify the imported data in your application');
        } else {
            console.log('📋 Manual fixes still needed:');
            console.log('1. Review the issues listed above');
            console.log('2. Fix the data in your Excel file');
            console.log('3. Re-run this script to verify fixes');
            
            if (!autoFix) {
                console.log('4. Consider using --auto-fix flag for automatic corrections');
            }
            
            console.log('5. Once all issues are resolved, proceed with employee import');
        }
        
        // Exit code based on remaining issues
        process.exit(results.summary.rowsWithIssues > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n📡 Database connection closed');
        }
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    processExcelData,
    createMissingData,
    formatExcelDate,
    fixEmail
};
