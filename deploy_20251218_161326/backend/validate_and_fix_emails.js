/**
 * Email Validation and Cleanup Script
 * 
 * This script analyzes the Excel file to identify invalid email formats,
 * suggests corrections, and can optionally create a cleaned version of the file.
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Email validation regex - more permissive than strict RFC5322
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate and analyze email addresses
 * @param {string} email - Email address to validate
 * @returns {object} - Validation result with suggestions
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return {
            isValid: false,
            issue: 'Missing or non-string email',
            suggestion: null
        };
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
        return {
            isValid: false,
            issue: 'Empty email after trimming',
            suggestion: null
        };
    }

    if (EMAIL_REGEX.test(trimmedEmail)) {
        return {
            isValid: true,
            cleaned: trimmedEmail,
            issue: null,
            suggestion: null
        };
    }

    // Common email issues and suggestions
    let suggestion = trimmedEmail;
    let issues = [];

    // Check for missing @
    if (!trimmedEmail.includes('@')) {
        issues.push('Missing @ symbol');
    }

    // Check for multiple @
    if ((trimmedEmail.match(/@/g) || []).length > 1) {
        issues.push('Multiple @ symbols');
    }

    // Check for missing domain
    if (trimmedEmail.includes('@') && !trimmedEmail.includes('.')) {
        issues.push('Missing domain extension');
    }

    // Common domain typos
    const domainFixes = {
        'gmail.co': 'gmail.com',
        'gmail.con': 'gmail.com',
        'gmial.com': 'gmail.com',
        'yahoo.co': 'yahoo.com',
        'yahoo.con': 'yahoo.com',
        'hotmail.co': 'hotmail.com',
        'hotmail.con': 'hotmail.com'
    };

    Object.keys(domainFixes).forEach(typo => {
        if (suggestion.includes(typo)) {
            suggestion = suggestion.replace(typo, domainFixes[typo]);
        }
    });

    // Remove extra dots
    suggestion = suggestion.replace(/\.{2,}/g, '.');
    
    // Remove leading/trailing dots in domain
    if (suggestion.includes('@')) {
        const [local, domain] = suggestion.split('@');
        const cleanDomain = domain.replace(/^\.+|\.+$/g, '');
        suggestion = `${local}@${cleanDomain}`;
    }

    // Final validation check on suggestion
    const finalValid = EMAIL_REGEX.test(suggestion);
    
    return {
        isValid: false,
        issue: issues.join(', ') || 'Invalid email format',
        suggestion: finalValid ? suggestion : null,
        autoFixable: finalValid && suggestion !== trimmedEmail
    };
}

/**
 * Process Excel file and validate emails
 * @param {string} filePath - Path to Excel file
 * @returns {object} - Analysis results
 */
function analyzeEmailsInExcel(filePath) {
    console.log(`📊 Analyzing emails in: ${filePath}`);
    
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
        validEmails: 0,
        invalidEmails: 0,
        duplicateEmails: 0,
        autoFixableEmails: 0,
        emailIssues: [],
        duplicates: new Map(),
        fixableRows: []
    };

    const seenEmails = new Set();
    
    data.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (accounting for header)
        const email = row.Email || row.email || row.EMAIL;
        
        const validation = validateEmail(email);
        
        if (validation.isValid) {
            results.validEmails++;
            const cleanEmail = validation.cleaned;
            
            // Check for duplicates
            if (seenEmails.has(cleanEmail)) {
                results.duplicateEmails++;
                if (results.duplicates.has(cleanEmail)) {
                    results.duplicates.get(cleanEmail).push(rowNum);
                } else {
                    results.duplicates.set(cleanEmail, [
                        [...seenEmails].indexOf(cleanEmail) + 2, // Find original row
                        rowNum
                    ]);
                }
            } else {
                seenEmails.add(cleanEmail);
            }
        } else {
            results.invalidEmails++;
            
            const issue = {
                row: rowNum,
                originalEmail: email,
                issue: validation.issue,
                suggestion: validation.suggestion,
                autoFixable: validation.autoFixable
            };
            
            results.emailIssues.push(issue);
            
            if (validation.autoFixable) {
                results.autoFixableEmails++;
                results.fixableRows.push({
                    row: rowNum,
                    original: email,
                    fixed: validation.suggestion
                });
            }
        }
    });

    return results;
}

/**
 * Generate detailed report from analysis results
 * @param {object} results - Analysis results
 */
function generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total rows: ${results.totalRows}`);
    console.log(`   Valid emails: ${results.validEmails} (${((results.validEmails/results.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Invalid emails: ${results.invalidEmails} (${((results.invalidEmails/results.totalRows)*100).toFixed(1)}%)`);
    console.log(`   Duplicate emails: ${results.duplicateEmails}`);
    console.log(`   Auto-fixable emails: ${results.autoFixableEmails}`);

    if (results.duplicates.size > 0) {
        console.log(`\n🔄 DUPLICATE EMAILS:`);
        results.duplicates.forEach((rows, email) => {
            console.log(`   "${email}" appears in rows: ${rows.join(', ')}`);
        });
    }

    if (results.autoFixableEmails > 0) {
        console.log(`\n🔧 AUTO-FIXABLE EMAILS:`);
        results.fixableRows.forEach(fix => {
            console.log(`   Row ${fix.row}: "${fix.original}" → "${fix.fixed}"`);
        });
    }

    if (results.emailIssues.length > 0) {
        console.log(`\n❌ INVALID EMAILS (first 10):`);
        results.emailIssues.slice(0, 10).forEach(issue => {
            console.log(`   Row ${issue.row}: "${issue.originalEmail}"`);
            console.log(`      Issue: ${issue.issue}`);
            if (issue.suggestion) {
                console.log(`      Suggested fix: "${issue.suggestion}"`);
            }
            console.log('');
        });
        
        if (results.emailIssues.length > 10) {
            console.log(`   ... and ${results.emailIssues.length - 10} more invalid emails.`);
        }
    }
}

/**
 * Create a cleaned version of the Excel file with fixed emails
 * @param {string} inputPath - Original Excel file path
 * @param {object} results - Analysis results
 * @returns {string} - Path to cleaned file
 */
function createCleanedFile(inputPath, results) {
    console.log('\n🔧 Creating cleaned Excel file...');
    
    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Apply fixes to the data
    let fixedCount = 0;
    results.fixableRows.forEach(fix => {
        const dataIndex = fix.row - 2; // Convert back to 0-indexed
        if (dataIndex >= 0 && dataIndex < data.length) {
            // Find the email column (handle different casing)
            const emailKey = Object.keys(data[dataIndex]).find(key => 
                key.toLowerCase() === 'email'
            );
            
            if (emailKey) {
                data[dataIndex][emailKey] = fix.fixed;
                fixedCount++;
            }
        }
    });

    // Create new workbook with cleaned data
    const newWorksheet = XLSX.utils.json_to_sheet(data);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

    // Generate output filename
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_email_cleaned${parsedPath.ext}`);
    
    XLSX.writeFile(newWorkbook, outputPath);
    
    console.log(`✅ Cleaned file created: ${outputPath}`);
    console.log(`📧 Fixed ${fixedCount} emails automatically`);
    
    return outputPath;
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node validate_and_fix_emails.js <excel_file_path> [--fix]');
        console.log('');
        console.log('Options:');
        console.log('  --fix    Create a cleaned version of the file with auto-fixes applied');
        console.log('');
        console.log('Example:');
        console.log('  node validate_and_fix_emails.js employees.xlsx --fix');
        return;
    }

    const filePath = args[0];
    const shouldFix = args.includes('--fix');

    try {
        const results = analyzeEmailsInExcel(filePath);
        generateReport(results);

        if (shouldFix && results.autoFixableEmails > 0) {
            const cleanedPath = createCleanedFile(filePath, results);
            console.log(`\n💡 NEXT STEPS:`);
            console.log(`1. Review the cleaned file: ${cleanedPath}`);
            console.log(`2. Manually fix remaining invalid emails (${results.invalidEmails - results.autoFixableEmails} left)`);
            console.log(`3. Remove duplicate email entries`);
            console.log(`4. Re-run the import with the cleaned file`);
        } else if (shouldFix) {
            console.log(`\n💡 No auto-fixable emails found. Manual review required.`);
        } else {
            console.log(`\n💡 NEXT STEPS:`);
            console.log(`1. Run with --fix flag to auto-correct fixable emails`);
            console.log(`2. Manually fix remaining validation issues`);
            console.log(`3. Remove duplicate entries`);
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
    validateEmail,
    analyzeEmailsInExcel,
    generateReport,
    createCleanedFile
};
