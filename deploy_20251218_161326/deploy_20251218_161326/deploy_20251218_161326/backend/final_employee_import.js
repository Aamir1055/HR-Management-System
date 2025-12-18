/**
 * Final Comprehensive Employee Import Script
 * 
 * This script handles ALL the issues we discovered:
 * 1. Status field conversion: "Active" → 1, "Inactive" → 0
 * 2. Excel date serial number conversion
 * 3. Email format validation and fixing
 * 4. Office/Position creation if missing
 * 5. Proper error reporting for failed rows
 */

const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const fs = require('fs');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Convert Excel date serial to YYYY-MM-DD format
 */
function formatExcelDateForDB(dateValue) {
  try {
    // Handle null/undefined/empty values
    if (!dateValue && dateValue !== 0) {
      return null;
    }
    
    // Handle Excel serial numbers (both number and string types)
    let serialNumber;
    if (typeof dateValue === 'number') {
      serialNumber = dateValue;
    } else if (typeof dateValue === 'string' && /^\d+$/.test(dateValue.trim())) {
      serialNumber = parseInt(dateValue.trim());
    }
    
    if (serialNumber && serialNumber > 1 && serialNumber < 100000) {
      // Excel date calculation: 1900-01-01 is day 1, but Excel incorrectly treats 1900 as a leap year
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000);
      
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      const result = `${year}-${month}-${day}`;
      console.log(`📅 Converted Excel date ${serialNumber} → ${result}`);
      return result;
    }
    
    // Try to parse DD/MM/YYYY format
    if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
      const [day, month, year] = dateValue.split('/');
      return `${year}-${month}-${day}`;
    }
    
    console.log(`⚠️ Could not parse date: ${dateValue} (${typeof dateValue})`);
    return null;
  } catch (error) {
    console.log(`❌ Date conversion error for ${dateValue}: ${error.message}`);
    return null;
  }
}

/**
 * Fix email format
 */
function fixEmail(email) {
  if (!email || email === '-') return null;
  
  let fixed = email.toString().trim().toLowerCase();
  fixed = fixed.replace(/\s+/g, '');
  fixed = fixed.replace(/,,+/g, '.');
  fixed = fixed.replace(/\.{2,}/g, '.');
  fixed = fixed.replace(/@+/g, '@');
  
  if (fixed.includes('@') && !fixed.includes('.') && !fixed.endsWith('.com')) {
    fixed += '.com';
  }
  
  fixed = fixed.replace(/@gmial\./g, '@gmail.')
          .replace(/@gmai\./g, '@gmail.')
          .replace(/@yahooo\./g, '@yahoo.')
          .replace(/@hotmial\./g, '@hotmail.');
  
  return EMAIL_REGEX.test(fixed) ? fixed : null;
}

/**
 * Convert status string to database value
 */
function convertStatus(status) {
  if (!status) return 1; // default to active
  const statusStr = status.toString().trim().toLowerCase();
  return statusStr === 'active' ? 1 : 0;
}

/**
 * Normalize gender to match DB enum
 */
function normalizeGender(gender) {
  if (!gender) return null;
  const g = gender.toString().trim().toLowerCase();
  if (g.startsWith('m')) return 'Male';
  if (g.startsWith('f')) return 'Female';
  if (g.length > 0) return 'Other';
  return null;
}

/**
 * Normalize marital status to match DB enum
 */
function normalizeMaritalStatus(status) {
  if (!status) return null;
  const s = status.toString().trim().toLowerCase();
  if (s.startsWith('single')) return 'Single';
  if (s.startsWith('married')) return 'Married';
  if (s.startsWith('div')) return 'Divorced';
  if (s.startsWith('wid')) return 'Widowed';
  if (s.length > 0) return 'Other';
  return null;
}

/**
 * Get or create office/position
 */
async function getOrCreateOffice(connection, officeName) {
  try {
    const [existing] = await connection.execute('SELECT id FROM offices WHERE name = ?', [officeName]);
    if (existing.length > 0) return existing[0].id;
    
    const [result] = await connection.execute(
      'INSERT INTO offices (name, created_at) VALUES (?, NOW())',
      [officeName]
    );
    console.log(`✅ Created office: ${officeName}`);
    return result.insertId;
  } catch (error) {
    console.log(`❌ Failed to create office '${officeName}': ${error.message}`);
    throw error;
  }
}

async function getOrCreatePosition(connection, positionTitle) {
  try {
    const [existing] = await connection.execute('SELECT id FROM positions WHERE title = ?', [positionTitle]);
    if (existing.length > 0) return existing[0].id;
    
    const [result] = await connection.execute(
      'INSERT INTO positions (title, created_at) VALUES (?, NOW())',
      [positionTitle]
    );
    console.log(`✅ Created position: ${positionTitle}`);
    return result.insertId;
  } catch (error) {
    console.log(`❌ Failed to create position '${positionTitle}': ${error.message}`);
    throw error;
  }
}

/**
 * Process and import employees
 */
async function importEmployees(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📋 Total rows to process: ${data.length}`);
    
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const failureReasons = [];
    
    // Check existing employee IDs and emails to avoid duplicates
    const [existingEmployees] = await connection.execute('SELECT employeeId, email FROM employees');
    const existingIds = new Set(existingEmployees.map(e => String(e.employeeId)));
    const existingEmails = new Set(existingEmployees.map(e => (e.email || '').toLowerCase()));
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number
      
      try {
        // Extract data
        const employeeId = row['Employee ID'] || row['EmployeeID'] || row['employee_id'] || row['ID'];
        const firstName = (row['First Name'] || row.FirstName || row.first_name || row.Name || '').toString().trim();
        const lastName = (row['Last Name'] || row.LastName || row.last_name || '').toString().trim();
        const emailRaw = row.Email || row.email || row.EMAIL;
        const phone = (row.Phone || row.phone || row.PHONE || row['Phone Number'] || '').toString().trim();
        const office = (row.Office || row.office || row.OFFICE || '').toString().trim();
        const position = (row.Position || row.position || row.POSITION || row.Role || row.role || '').toString().trim();
        const salary = row['Monthly Salary'] || row.Salary || row.salary || row.SALARY;
        const status = row.Status || row.status || row.STATUS;
        const joiningDateRaw = row['Date of Joining'] || row['Joining Date'] || row.JoiningDate;
        const dobRaw = row['Date of Birth'] || row.DOB || row.DateOfBirth;

        // Optional/Additional fields
        const nationality = (row.Nationality || row.nationality || '').toString().trim();
        const passportNumber = (row['Passport Number'] || row.Passport || row['Passport No'] || row.passport || '').toString().trim();
        const passportExpiryRaw = row['Passport Expiry'] || row['Passport Expiry Date'] || row.passport_expiry;
        const visaType = (row['Visa Type'] || row['Visa'] || row.visa || '').toString().trim();
        const visaExpiryRaw = row['Visa Expiry'] || row['Visa Expiry Date'] || row.visa_expiry;
        const platform = (row.Platform || row.platform || '').toString().trim();
        const currentAddress = (row['Current Address'] || row.Address || row.address || '').toString().trim();
        const emergencyContactRelation = (row['Emergency Contact Relation'] || row['Emergency Relation'] || '').toString().trim();
        const emergencyContact = (row['Emergency Contact'] || row['Emergency Phone'] || '').toString().trim();
        const whatsapp = (row['WhatsApp'] || row['Whatsapp'] || row.whatsapp || '').toString().trim();
        const genderRaw = row.Gender || row.gender;
        const maritalStatusRaw = row['Marital Status'] || row.marital_status;
        const primaryLanguage = (row['Primary Language'] || row.primary_language || '').toString().trim();
        const secondaryLanguage = (row['Secondary Language'] || row.secondary_language || '').toString().trim();
        const hiringSource = (row['Hiring Source'] || row.hiring_source || '').toString().trim();
        
        // Validate required fields
        if (!employeeId || !firstName || !emailRaw || !office || !position || !salary) {
          failureReasons.push(`Row ${rowNum}: Missing required field(s)`);
          failed++;
          continue;
        }
        
        // Process data
        const employeeIdStr = String(employeeId).trim();
        const email = fixEmail(emailRaw);
        const statusInt = convertStatus(status);
        const salaryFloat = parseFloat(salary);
        const joiningDate = formatExcelDateForDB(joiningDateRaw);
        const dob = formatExcelDateForDB(dobRaw);
        const passportExpiry = formatExcelDateForDB(passportExpiryRaw);
        const visaExpiry = formatExcelDateForDB(visaExpiryRaw);
        const gender = normalizeGender(genderRaw);
        const maritalStatus = normalizeMaritalStatus(maritalStatusRaw);
        
        // Validate processed data
        if (!email) {
          failureReasons.push(`Row ${rowNum}: Invalid email '${emailRaw}'`);
          failed++;
          continue;
        }
        
        if (isNaN(salaryFloat) || salaryFloat <= 0) {
          failureReasons.push(`Row ${rowNum}: Invalid salary '${salary}'`);
          failed++;
          continue;
        }
        
        // Get or create office and position
        const officeId = await getOrCreateOffice(connection, office);
        const positionId = await getOrCreatePosition(connection, position);
        
        // If employee already exists, update their record to fill blanks instead of skipping
        if (existingIds.has(employeeIdStr) || existingEmails.has(email.toLowerCase())) {
          const updateWhereField = existingIds.has(employeeIdStr) ? 'employeeId' : 'email';
          const updateWhereValue = existingIds.has(employeeIdStr) ? parseInt(employeeIdStr) : email.toLowerCase();

          const updateQuery = `
            UPDATE employees SET
              name = ?,
              first_name = ?,
              last_name = ?,
              email = ?,
              phone = ?,
              office_id = ?,
              position_id = ?,
              monthlySalary = ?,
              status = ?,
              joiningDate = COALESCE(?, joiningDate),
              dob = COALESCE(?, dob),
              nationality = COALESCE(?, nationality),
              passport_number = COALESCE(?, passport_number),
              visa_type = COALESCE(?, visa_type),
              platform = COALESCE(?, platform),
              current_address = COALESCE(?, current_address),
              emergency_contact_relation = COALESCE(?, emergency_contact_relation),
              emergency_contact = COALESCE(?, emergency_contact),
              whatsapp = COALESCE(?, whatsapp),
              gender = COALESCE(?, gender),
              marital_status = COALESCE(?, marital_status),
              primary_language = COALESCE(?, primary_language),
              secondary_language = COALESCE(?, secondary_language),
              hiring_source = COALESCE(?, hiring_source),
              passport_expiry = COALESCE(?, passport_expiry),
              visa_expiry = COALESCE(?, visa_expiry),
              updated_at = NOW()
            WHERE ${updateWhereField} = ?
          `;

          const fullName = `${firstName} ${lastName}`.trim();

          await connection.execute(updateQuery, [
            fullName,
            firstName,
            lastName,
            email,
            phone,
            officeId,
            positionId,
            salaryFloat,
            statusInt,
            joiningDate,
            dob,
            nationality || null,
            passportNumber || null,
            visaType || null,
            platform || null,
            currentAddress || null,
            emergencyContactRelation || null,
            emergencyContact || null,
            whatsapp || null,
            gender || null,
            maritalStatus || null,
            primaryLanguage || null,
            secondaryLanguage || null,
            hiringSource || null,
            passportExpiry || null,
            visaExpiry || null,
            updateWhereValue
          ]);

          successful++;
          if (successful % 50 === 0) {
            console.log(`✅ Processed ${successful} employees...`);
          }
          continue;
        }
        
        // Insert employee
        const insertQuery = `
          INSERT INTO employees (
            employeeId, name, first_name, last_name, email, phone,
            office_id, position_id, monthlySalary, status,
            joiningDate, dob,
            nationality, passport_number, visa_type, platform,
            current_address, emergency_contact_relation, emergency_contact,
            whatsapp, gender, marital_status, primary_language, secondary_language, hiring_source,
            passport_expiry, visa_expiry,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const fullName = `${firstName} ${lastName}`.trim();
        
        await connection.execute(insertQuery, [
          parseInt(employeeIdStr),
          fullName,
          firstName,
          lastName,
          email,
          phone,
          officeId,
          positionId,
          salaryFloat,
          statusInt,
          joiningDate,
          dob,
          nationality || null,
          passportNumber || null,
          visaType || null,
          platform || null,
          currentAddress || null,
          emergencyContactRelation || null,
          emergencyContact || null,
          whatsapp || null,
          gender || null,
          maritalStatus || null,
          primaryLanguage || null,
          secondaryLanguage || null,
          hiringSource || null,
          passportExpiry || null,
          visaExpiry || null
        ]);
        
        // Add to existing sets to prevent duplicates in this batch
        existingIds.add(employeeIdStr);
        existingEmails.add(email.toLowerCase());
        
        successful++;
        
        if (successful % 50 === 0) {
          console.log(`✅ Processed ${successful} employees...`);
        }
        
      } catch (error) {
        failureReasons.push(`Row ${rowNum}: ${error.message}`);
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL IMPORT RESULTS');
    console.log('='.repeat(80));
    console.log(`✅ Successfully imported: ${successful} employees`);
    console.log(`❌ Failed to import: ${failed} rows`);
    console.log(`⏭️  Skipped (duplicates): ${skipped} rows`);
    console.log(`📋 Total processed: ${successful + failed + skipped} / ${data.length}`);
    
    if (failureReasons.length > 0) {
      console.log('\n❌ FAILURE DETAILS (first 20):');
      failureReasons.slice(0, 20).forEach(reason => {
        console.log(`   ${reason}`);
      });
      
      if (failureReasons.length > 20) {
        console.log(`   ... and ${failureReasons.length - 20} more failures`);
      }
    }
    
    if (successful === data.length) {
      console.log('\n🎉 SUCCESS! All employees imported successfully!');
    } else if (successful > 0) {
      console.log(`\n⚠️  Partial success: ${successful}/${data.length} employees imported`);
    } else {
      console.log('\n💥 FAILED: No employees were imported');
    }
    
    return {
      successful,
      failed,
      skipped,
      total: data.length,
      failureReasons
    };
    
  } finally {
    await connection.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node final_employee_import.js <excel_file_path>');
    console.log('');
    console.log('Example:');
    console.log('  node final_employee_import.js "C:\\path\\to\\employees.xlsx"');
    return;
  }
  
  const filePath = args[0];
  
  console.log('🚀 Starting Final Employee Import...');
  console.log(`📁 File: ${filePath}`);
  console.log('⚡ Features: Status conversion, Date handling, Email fixing, Auto office/position creation');
  console.log('');
  
  try {
    await importEmployees(filePath);
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { importEmployees };
