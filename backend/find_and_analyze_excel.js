/**
 * Excel File Finder and Analyzer Helper
 * 
 * This script helps locate your employee Excel files and provides the exact commands 
 * needed to analyze and fix import issues.
 */

const fs = require('fs');
const path = require('path');

/**
 * Recursively find Excel files
 */
function findExcelFiles(dir, maxDepth = 2, currentDepth = 0) {
    const files = [];
    
    if (currentDepth > maxDepth) return files;
    
    try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            
            try {
                const stat = fs.statSync(fullPath);
                
                if (stat.isFile() && (item.endsWith('.xlsx') || item.endsWith('.xls'))) {
                    const stats = fs.statSync(fullPath);
                    files.push({
                        name: item,
                        path: fullPath,
                        size: Math.round(stats.size / 1024), // KB
                        modified: stats.mtime.toISOString().split('T')[0]
                    });
                } else if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    files.push(...findExcelFiles(fullPath, maxDepth, currentDepth + 1));
                }
            } catch (err) {
                // Skip files we can't access
            }
        }
    } catch (err) {
        // Skip directories we can't access
    }
    
    return files;
}

/**
 * Find likely employee files
 */
function findEmployeeFiles(files) {
    const employeeKeywords = ['employee', 'staff', 'worker', 'personnel', 'emp', '2025'];
    
    return files.filter(file => {
        const nameLower = file.name.toLowerCase();
        return employeeKeywords.some(keyword => nameLower.includes(keyword));
    });
}

console.log('🔍 Searching for Excel files...');

// Search common locations
const searchPaths = [
    'C:\\Users\\bazaa\\Desktop',
    'C:\\Users\\bazaa\\Downloads',
    'C:\\Users\\bazaa\\Documents',
    'C:\\Users\\bazaa\\Desktop\\PayRollManagementSystem'
];

let allFiles = [];

for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
        console.log(`   Searching: ${searchPath}`);
        const files = findExcelFiles(searchPath);
        allFiles.push(...files);
    }
}

console.log(`\n📋 Found ${allFiles.length} Excel files total`);

const employeeFiles = findEmployeeFiles(allFiles);

if (employeeFiles.length > 0) {
    console.log(`\n👥 Found ${employeeFiles.length} potential employee files:`);
    employeeFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name}`);
        console.log(`      Path: ${file.path}`);
        console.log(`      Size: ${file.size}KB, Modified: ${file.modified}`);
        console.log('');
    });
    
    const largestFile = employeeFiles.reduce((prev, current) => 
        (prev.size > current.size) ? prev : current
    );
    
    console.log(`🎯 RECOMMENDED FILE (largest): ${largestFile.name}`);
    console.log(`   Path: ${largestFile.path}`);
    console.log('');
    
    console.log('🔧 COMMANDS TO RUN:');
    console.log('');
    console.log('1. Analyze what\'s blocking the import:');
    console.log(`   node analyze_excel_import_gap.js "${largestFile.path}" --save-report`);
    console.log('');
    console.log('2. Run comprehensive validation:');
    console.log(`   node comprehensive_validation.js "${largestFile.path}" --report`);
    console.log('');
    console.log('3. Apply automatic fixes:');
    console.log(`   node master_employee_fix.js "${largestFile.path}" --auto-fix`);
    console.log('');
    console.log('4. Try the import again after fixes are applied.');
    
} else {
    console.log('\n❌ No employee Excel files found in common locations.');
    console.log('');
    console.log('📂 All Excel files found:');
    allFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name} (${file.size}KB) - ${file.path}`);
    });
    
    if (allFiles.length > 0) {
        console.log('\n💡 If any of these files contain employee data, use these commands:');
        console.log('   node analyze_excel_import_gap.js "FULL_PATH_TO_YOUR_FILE.xlsx" --save-report');
    }
}

console.log('\n📝 TROUBLESHOOTING:');
console.log('• If your file is not listed, copy it to the backend folder');
console.log('• Make sure the file name contains "employee" or similar keywords');
console.log('• Check file permissions if getting access errors');
