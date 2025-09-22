/**
 * Employee Controller - Manages employee data operations and Excel file imports
 * Handles CRUD operations for employee records including bulk imports and data validation
 */
const XLSX = require('xlsx');
const fs = require('fs');

// --- Helpers ---
function excelDateToJSDate(serial) {
  // If it's already a string in date format, normalize it properly
  if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
    try {
      const parts = serial.split(/[-\/]/);
      if (parts.length === 3) {
        let day, month, year;
        
        if (parts[0].length === 4) {
          // YYYY-MM-DD or YYYY/MM/DD format
          year = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1; // 0-indexed for Date constructor
          day = parseInt(parts[2]);
        } else {
          // DD-MM-YYYY, DD/MM/YYYY, MM-DD-YYYY, or MM/DD/YYYY format
          year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2]);
          
          // Always treat as DD/MM/YYYY format for consistency
          // This ensures the Excel data is processed in the same format we expect
          const first = parseInt(parts[0]);
          const second = parseInt(parts[1]);
          
          // Check for obviously wrong DD/MM interpretation
          if (first > 31) {
            // First part > 31, cannot be day, likely MM/DD/YYYY format
            console.warn(`⚠️ Date ${serial} appears to be MM/DD/YYYY but we expect DD/MM/YYYY`);
            month = first - 1; // 0-indexed for Date constructor
            day = second;
          } else if (second > 12) {
            // Second part > 12, must be DD/MM format
            day = first;
            month = second - 1; // 0-indexed for Date constructor
          } else {
            // Both <= 12, ALWAYS assume DD/MM format
            // This ensures consistent behavior - all dates are treated as DD/MM/YYYY
            day = first;
            month = second - 1; // 0-indexed for Date constructor
          }
        }
        
        // Create date without timezone manipulation
        const dateObj = new Date(year, month, day);
        
        // Format as YYYY-MM-DD
        const finalYear = dateObj.getFullYear();
        const finalMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const finalDay = dateObj.getDate().toString().padStart(2, '0');
        
        console.log(`📊 EXCEL String Date: ${serial} → ${finalYear}-${finalMonth}-${finalDay}`);
        return `${finalYear}-${finalMonth}-${finalDay}`;
      }
    } catch (e) {
      console.warn(`Failed to parse date string: ${serial}`, e);
    }
    return serial;
  }
  
  // Handle Excel date serial numbers
  if (typeof serial === 'number') {
    // Excel date serial calculation (1900-based system)
    const EXCEL_EPOCH_DIFF = 25569; // Days between 1900-01-01 and 1970-01-01
    const MS_PER_DAY = 86400000;
    
    // Convert serial to milliseconds since Unix epoch
    const dateMs = (serial - EXCEL_EPOCH_DIFF) * MS_PER_DAY;
    
    // Create date object from milliseconds
    const date = new Date(dateMs);
    
    // Extract date components using UTC to avoid any timezone conversion
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    
    console.log(`📊 EXCEL Serial Date: ${serial} → ${year}-${month}-${day}`);
    return `${year}-${month}-${day}`;
  }
  
  return serial;
}

const getOfficeIdByName = async (office_name, db) => {
  if (!db) throw new Error('Database connection is missing in getOfficeIdByName');
  const [office] = await db.query('SELECT id FROM offices WHERE name = ?', [office_name]);
  if (!office || !office[0]) throw new Error('Invalid office_name: ' + office_name);
  return office[0].id;
};
const getPositionIdByName = async (position_name, db) => {
  if (!db) throw new Error('Database connection is missing in getPositionIdByName');
  const [position] = await db.query('SELECT id FROM positions WHERE title = ?', [position_name]);
  if (!position || !position[0]) throw new Error('Invalid position_name: ' + position_name);
  return position[0].id;
};
const getVisaTypeIdByName = async (visa_type_name, db) => {
  if (!db) throw new Error('Database connection is missing in getVisaTypeIdByName');
  if (!visa_type_name) return null; // Allow null visa types
  const [visaType] = await db.query('SELECT id FROM visa_types WHERE typeofvisa = ?', [visa_type_name]);
  if (!visaType || !visaType[0]) throw new Error('Invalid visa_type_name: ' + visa_type_name);
  return visaType[0].id;
};
const getPlatformNameById = async (platform_id, db) => {
  if (!db) throw new Error('Database connection is missing in getPlatformNameById');
  if (!platform_id) return null; // Allow null platforms
  const [platform] = await db.query('SELECT platform_name FROM platforms WHERE id = ?', [platform_id]);
  if (!platform || !platform[0]) throw new Error('Invalid platform_id: ' + platform_id);
  return platform[0].platform_name;
};

const getPlatformIdByName = async (platform_name, db) => {
  if (!db) throw new Error('Database connection is missing in getPlatformIdByName');
  if (!platform_name) return null; // Allow null platforms
  const [platform] = await db.query('SELECT id FROM platforms WHERE platform_name = ?', [platform_name]);
  if (!platform || !platform[0]) throw new Error('Invalid platform_name: ' + platform_name);
  return platform[0].id;
};

// Helper function to format YYYY-MM-DD dates to DD/MM/YYYY for frontend display
const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return null;
  
  // If it's already in YYYY-MM-DD format (from database)
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  
  // Return as-is if not in expected format
  return dateStr;
};



// --- Main Export ---
module.exports = {
  // -- Import (primary required, secondary optional) --
  importEmployees: async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const db = req.db;
      if (!db) throw new Error('Database connection not available on request');
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log('[IMPORT] Read data rows:', data.length);

      // Check for required columns with flexible naming - UPDATED to accept names instead of IDs
      const requiredColumnsMap = {
        'Employee ID': ['Employee ID', 'employee_id', 'employeeId'],
        'First Name': ['First Name', 'first_name', 'firstName'],
        'Last Name': ['Last Name', 'last_name', 'lastName'],
        'Email': ['Email', 'email'],
        'Office Name': ['Office Name', 'office_name', 'officeName', 'Office', 'Office ID', 'office_id', 'officeId'], // Accept Office, Office Name, and Office ID
        'Position Name': ['Position Name', 'position_name', 'positionName', 'Position', 'Position ID', 'position_id', 'positionId'], // Accept Position, Position Name, and Position ID
        'Salary': ['Salary', 'salary', 'monthlySalary', 'Monthly Salary'],
        'Joining Date': ['Joining Date', 'joining_date', 'joiningDate', 'Date of Joining (DD/MM/YYYY)', 'Date of Joining'],
        'Status': ['Status', 'status']
      };
      
      // Declare columnMapping outside the if block to ensure proper scope
      let columnMapping = {};
      
      if (data[0]) {
        const availableColumns = Object.keys(data[0]);
        console.log('[IMPORT] Available columns in Excel:', availableColumns);
        
        for (const [standardName, possibleNames] of Object.entries(requiredColumnsMap)) {
          let found = false;
          for (const possibleName of possibleNames) {
            if (availableColumns.includes(possibleName)) {
              columnMapping[standardName] = possibleName;
              found = true;
              break;
            }
          }
          if (!found) {
            throw new Error(`Required column "${standardName}" not found in Excel file. Available columns: ${availableColumns.join(', ')}`);
          }
        }
        
        console.log('[IMPORT] Column mapping:', columnMapping);
      } else {
        throw new Error('Excel file has no data');
      }

      const processed = [];
      for (const row of data) {
        // Log raw row
        console.log('[IMPORT] Raw Excel row:', row);

        // Use column mapping to get values - moved inside the loop with proper scope
        const getColumnValue = (standardName) => {
          const actualColumnName = columnMapping[standardName];
          return actualColumnName ? row[actualColumnName] : null;
        };

        const employeeId = getColumnValue('Employee ID');
        const officeValue = getColumnValue('Office Name'); // Now using Office Name instead of Office ID
        const positionValue = getColumnValue('Position Name'); // Now using Position Name instead of Position ID

        if (!employeeId || !officeValue || !positionValue) continue;
        try {
          // Convert office name/ID to office ID
          let office_id;
          if (typeof officeValue === 'string' && isNaN(Number(officeValue))) {
            // It's a name, convert to ID
            office_id = await getOfficeIdByName(officeValue, db);
            console.log(`[IMPORT] Office name '${officeValue}' → ID ${office_id}`);
          } else {
            // It's a number ID (backward compatibility)
            office_id = Number(officeValue);
            if (isNaN(office_id)) {
              throw new Error(`Invalid office value '${officeValue}' for employee ${employeeId}`);
            }
          }
          
          // Convert position name/ID to position ID
          let position_id;
          if (typeof positionValue === 'string' && isNaN(Number(positionValue))) {
            // It's a name, convert to ID
            position_id = await getPositionIdByName(positionValue, db);
            console.log(`[IMPORT] Position name '${positionValue}' → ID ${position_id}`);
          } else {
            // It's a number ID (backward compatibility)
            position_id = Number(positionValue);
            if (isNaN(position_id)) {
              throw new Error(`Invalid position value '${positionValue}' for employee ${employeeId}`);
            }
          }
          
          const statusRaw = getColumnValue('Status');
          let statusValue = 1;
          if (typeof statusRaw === 'string') {
            statusValue = (statusRaw.toLowerCase() === 'active') ? 1 : 0;
          } else if (typeof statusRaw === 'boolean') {
            statusValue = statusRaw ? 1 : 0;
          } else if (typeof statusRaw === 'number') {
            statusValue = statusRaw;
          }

          // Parse secondary date fields with explicit logging
          const joiningDateRaw = getColumnValue('Joining Date');
          const joiningDate = excelDateToJSDate(joiningDateRaw);
          
          // Handle DOB with flexible column names
          const dobRaw = row['DOB'] || row['Date of Birth (DD/MM/YYYY)'] || row['Date of Birth'] || null;
          const dobParsed = dobRaw ? excelDateToJSDate(dobRaw) : null;
          
          // Handle Passport Expiry with flexible column names
          const passportExpiryRaw = row['Passport Expiry'] || row['Passport Expiry (DD/MM/YYYY)'] || null;
          const passportExpiryParsed = passportExpiryRaw ? excelDateToJSDate(passportExpiryRaw) : null;
          
          // Handle Visa Expiry with flexible column names  
          const visaExpiryRaw = row['Visa Expiry'] || row['Visa Expiry (DD/MM/YYYY)'] || null;
          const visaExpiryParsed = visaExpiryRaw ? excelDateToJSDate(visaExpiryRaw) : null;

          // Parse visa type - handle both names and IDs
          let visaTypeName = null;
          if (row['Visa Type']) {
            console.log(`[IMPORT] Processing Visa Type: '${row['Visa Type']}' (type: ${typeof row['Visa Type']})`);
            if (typeof row['Visa Type'] === 'string' && isNaN(Number(row['Visa Type']))) {
              // It's already a name, use directly
              visaTypeName = row['Visa Type'];
              console.log(`[IMPORT] Visa Type name '${visaTypeName}' used directly for employee ${employeeId}`);
            } else {
              // It's an ID, convert to name
              const visaTypeId = Number(row['Visa Type']);
              if (isNaN(visaTypeId)) {
                console.warn(`[IMPORT] Warning: Invalid Visa Type value '${row['Visa Type']}' for employee ${employeeId}`);
                visaTypeName = null;
              } else {
                // Get visa type name from database
                const [visaTypeResult] = await db.query('SELECT typeofvisa FROM visa_types WHERE id = ?', [visaTypeId]);
                if (visaTypeResult && visaTypeResult[0]) {
                  visaTypeName = visaTypeResult[0].typeofvisa;
                  console.log(`[IMPORT] Visa Type ID ${visaTypeId} → name '${visaTypeName}' for employee ${employeeId}`);
                } else {
                  console.warn(`[IMPORT] Warning: No visa type found for ID '${visaTypeId}' for employee ${employeeId}`);
                  visaTypeName = null;
                }
              }
            }
          }

          // Parse platform - handle both names and IDs
          let platformName = null;
          if (row['Platform']) {
            console.log(`[IMPORT] Processing Platform: '${row['Platform']}' (type: ${typeof row['Platform']})`);
            if (typeof row['Platform'] === 'string' && isNaN(Number(row['Platform']))) {
              // It's already a name, use directly
              platformName = row['Platform'];
              console.log(`[IMPORT] Platform name '${platformName}' used directly for employee ${employeeId}`);
            } else {
              // It's an ID, convert to name
              const platformId = Number(row['Platform']);
              if (isNaN(platformId)) {
                console.warn(`[IMPORT] Warning: Invalid Platform value '${row['Platform']}' for employee ${employeeId}`);
                platformName = null;
              } else {
                // Get platform name from database
                const [platformResult] = await db.query('SELECT platform_name FROM platforms WHERE id = ?', [platformId]);
                if (platformResult && platformResult[0]) {
                  platformName = platformResult[0].platform_name;
                  console.log(`[IMPORT] Platform ID ${platformId} → name '${platformName}' for employee ${employeeId}`);
                } else {
                  console.warn(`[IMPORT] Warning: No platform found for ID '${platformId}' for employee ${employeeId}`);
                  platformName = null;
                }
              }
            }
          } else {
            console.log(`[IMPORT] No Platform data for employee ${employeeId}`);
          }

          // Log conversions
          console.log(`[IMPORT] Employee ${employeeId}:
            Joining Date raw='${joiningDateRaw}' parsed='${joiningDate}'
            DOB raw='${dobRaw}' parsed='${dobParsed}'
            Passport Expiry raw='${passportExpiryRaw}' parsed='${passportExpiryParsed}'
            Visa Type raw='${row['Visa Type']}' resolved name='${visaTypeName}'
            Platform raw='${row['Platform']}' resolved name='${platformName}'
          `);

          const firstName = getColumnValue('First Name');
          const lastName = getColumnValue('Last Name');
          
          processed.push([
            employeeId,
            `${firstName || ''} ${lastName || ''}`.trim() || null,
            firstName || null,
            lastName || null,
            row['nationality'] || row['Nationality'] || null,
            getColumnValue('Email'),
            office_id,
            position_id,
            getColumnValue('Salary'),
            joiningDate,
            statusValue,
            dobParsed,
            row['Passport Number'] || null,
            passportExpiryParsed,
            visaTypeName,
            visaExpiryParsed,
            platformName,
            row['Address'] || null,
            row['Current Address'] || null,
            row['Phone'] || null,
            row['WhatsApp'] || null,
            row['Gender'] || null,
            row['Primary Language'] || null,
            row['Secondary Language'] || null,
            row['Marital Status'] || null,
            row['Hiring Source'] || null,
            row['Salary Currency'] || 'AED',
            row['Emirates ID'] || null,
            row['Emergency Contact'] || null,
            row['emergency_contact_relation'] || row['Emergency Contact Relation'] || null
          ]);
        } catch (error) {
          console.error('[IMPORT] Error in row:', error);
          throw new Error(`Error processing employee ${row['Employee ID']}: ${error.message}`);
        }
      }
      if (processed.length > 0) {
        const placeholders = processed.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = processed.flat();
        const sql = `
          INSERT INTO employees 
          (employeeId, name, first_name, last_name, nationality, email, office_id, position_id, monthlySalary, joiningDate, status,
            dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
            primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact, emergency_contact_relation)
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            nationality = VALUES(nationality),
            email = VALUES(email),
            office_id = VALUES(office_id),
            position_id = VALUES(position_id),
            monthlySalary = VALUES(monthlySalary),
            joiningDate = VALUES(joiningDate),
            status = VALUES(status),
            dob = VALUES(dob),
            passport_number = VALUES(passport_number),
            passport_expiry = VALUES(passport_expiry),
            visa_type = VALUES(visa_type),
            visa_expiry = VALUES(visa_expiry),
            platform = VALUES(platform),
            address = VALUES(address),
            current_address = VALUES(current_address),
            phone = VALUES(phone),
            whatsapp = VALUES(whatsapp),
            gender = VALUES(gender),
            primary_language = VALUES(primary_language),
            secondary_language = VALUES(secondary_language),
            marital_status = VALUES(marital_status),
            hiring_source = VALUES(hiring_source),
            salary_currency = VALUES(salary_currency),
            emirates_id = VALUES(emirates_id),
            emergency_contact = VALUES(emergency_contact),
            emergency_contact_relation = VALUES(emergency_contact_relation)
        `;
        console.log('[IMPORT] SQL to run:', sql);
        console.log('[IMPORT] First row values:', processed[0]);
        const result = await db.query(sql, flatValues);
        console.log('[IMPORT] DB result:', result && result[0]);
      }
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({
        message: `${processed.length} employees imported successfully`,
        imported: processed.length
      });
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('[IMPORT] Import failed:', err);
      res.status(500).json({ error: 'Import failed: ' + err.message });
    }
  },

  // -- Import secondary data only --
  importSecondaryEmployeeData: async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const db = req.db;
      const workbook = XLSX.readFile(req.file.path);
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      let updated = 0, errors = [];

      for (const row of data) {
        console.log('[SEC IMPORT] Raw row:', row);

        const { 'Employee ID': employeeId } = row;
        if (!employeeId) {
          errors.push('Missing Employee ID in a row');
          continue;
        }
        const fields = [];
        const values = [];
        
        // Handle new basic fields
        if ('First Name' in row) fields.push('first_name = ?'), values.push(row['First Name'] || null);
        if ('Last Name' in row) fields.push('last_name = ?'), values.push(row['Last Name'] || null);
        if ('Nationality' in row) fields.push('nationality = ?'), values.push(row['Nationality'] || null);
        
        // Handle date fields with proper parsing
        if ('DOB' in row) {
          const dob = row['DOB'] ? excelDateToJSDate(row['DOB']) : null;
          console.log(`[SEC IMPORT] ${employeeId}: DOB raw='${row['DOB']}', parsed='${dob}'`);
          fields.push('dob = ?'); values.push(dob);
        }
        
        // Handle contact information
        if ('Phone' in row) fields.push('phone = ?'), values.push(row['Phone'] || null);
        if ('WhatsApp' in row) fields.push('whatsapp = ?'), values.push(row['WhatsApp'] || null);
        if ('Gender' in row) fields.push('gender = ?'), values.push(row['Gender'] || null);
        if ('Marital Status' in row) fields.push('marital_status = ?'), values.push(row['Marital Status'] || null);
        if ('Primary Language' in row) fields.push('primary_language = ?'), values.push(row['Primary Language'] || null);
        if ('Secondary Language' in row) fields.push('secondary_language = ?'), values.push(row['Secondary Language'] || null);
        
        // Handle document fields
        if ('Passport Number' in row) fields.push('passport_number = ?'), values.push(row['Passport Number'] || null);
        if ('Passport Expiry' in row) {
          const pe = row['Passport Expiry'] ? excelDateToJSDate(row['Passport Expiry']) : null;
          console.log(`[SEC IMPORT] ${employeeId}: Passport Expiry raw='${row['Passport Expiry']}', parsed='${pe}'`);
          fields.push('passport_expiry = ?'); values.push(pe);
        }
        
        if ('Visa Type' in row) {
          let visaTypeName = null;
          if (row['Visa Type']) {
            if (typeof row['Visa Type'] === 'string' && isNaN(Number(row['Visa Type']))) {
              // It's already a name, use directly
              visaTypeName = row['Visa Type'];
              console.log(`[SEC IMPORT] Visa Type name '${visaTypeName}' used directly for employee ${employeeId}`);
            } else {
              // It's an ID, convert to name
              const visaTypeId = Number(row['Visa Type']);
              if (isNaN(visaTypeId)) {
                console.warn(`[SEC IMPORT] Warning: Invalid Visa Type value '${row['Visa Type']}' for employee ${employeeId}`);
                visaTypeName = null;
              } else {
                // Get visa type name from database
                const [visaTypeResult] = await db.query('SELECT typeofvisa FROM visa_types WHERE id = ?', [visaTypeId]);
                if (visaTypeResult && visaTypeResult[0]) {
                  visaTypeName = visaTypeResult[0].typeofvisa;
                  console.log(`[SEC IMPORT] Visa Type ID ${visaTypeId} → name '${visaTypeName}' for employee ${employeeId}`);
                } else {
                  console.warn(`[SEC IMPORT] Warning: No visa type found for ID '${visaTypeId}' for employee ${employeeId}`);
                  visaTypeName = null;
                }
              }
            }
          }
          fields.push('visa_type = ?');
          values.push(visaTypeName);
        }
        
        if ('Visa Expiry' in row) {
          const ve = row['Visa Expiry'] ? excelDateToJSDate(row['Visa Expiry']) : null;
          console.log(`[SEC IMPORT] ${employeeId}: Visa Expiry raw='${row['Visa Expiry']}', parsed='${ve}'`);
          fields.push('visa_expiry = ?'); values.push(ve);
        }
        
        if ('Hiring Source' in row) fields.push('hiring_source = ?'), values.push(row['Hiring Source'] || null);
        
        // Handle emergency contact
        if ('Emergency Contact' in row) fields.push('emergency_contact = ?'), values.push(row['Emergency Contact'] || null);
        if ('Emergency Contact Relation' in row) fields.push('emergency_contact_relation = ?'), values.push(row['Emergency Contact Relation'] || null);
        
        // Handle address information
        if ('Current Address' in row) fields.push('current_address = ?'), values.push(row['Current Address'] || null);
        if ('Address' in row) fields.push('address = ?'), values.push(row['Address'] || null);
        
        // Handle platform
        if ('Platform' in row) {
          let platformName = null;
          if (row['Platform']) {
            if (typeof row['Platform'] === 'string' && isNaN(Number(row['Platform']))) {
              // It's already a name, use directly
              platformName = row['Platform'];
              console.log(`[SEC IMPORT] Platform name '${platformName}' used directly for employee ${employeeId}`);
            } else {
              // It's an ID, convert to name
              const platformId = Number(row['Platform']);
              if (isNaN(platformId)) {
                console.warn(`[SEC IMPORT] Warning: Invalid Platform value '${row['Platform']}' for employee ${employeeId}`);
                platformName = null;
              } else {
                // Get platform name from database
                const [platformResult] = await db.query('SELECT platform_name FROM platforms WHERE id = ?', [platformId]);
                if (platformResult && platformResult[0]) {
                  platformName = platformResult[0].platform_name;
                  console.log(`[SEC IMPORT] Platform ID ${platformId} → name '${platformName}' for employee ${employeeId}`);
                } else {
                  console.warn(`[SEC IMPORT] Warning: No platform found for ID '${platformId}' for employee ${employeeId}`);
                  platformName = null;
                }
              }
            }
          }
          fields.push('platform = ?');
          values.push(platformName);
        }
        
        // Handle additional fields
        if ('Salary Currency' in row) fields.push('salary_currency = ?'), values.push(row['Salary Currency'] || 'AED');
        if ('Emirates ID' in row) fields.push('emirates_id = ?'), values.push(row['Emirates ID'] || null);
        if (fields.length === 0) {
          errors.push(`No secondary fields for Employee ID ${employeeId}`);
          continue;
        }
        values.push(employeeId);
        const sql = `UPDATE employees SET ${fields.join(', ')} WHERE employeeId = ?`;
        console.log(`[SEC IMPORT] SQL: ${sql}, values:`, values);
        const [result] = await db.query(sql, values);
        console.log(`[SEC IMPORT] DB result for ${employeeId}:`, result);
        if (result.affectedRows === 0) {
          errors.push(`No employee found with ID ${employeeId}`);
        } else {
          updated++;
        }
      }
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({
        updated,
        errors,
        message: `${updated} employees updated. ${errors.length > 0 ? errors.join('; ') : 'No errors.'}`,
      });
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('[SEC IMPORT] Import failed:', err);
      res.status(500).json({ error: 'Import failed: ' + err.message });
    }
  },

  // -- Export Excel employee template with all fields --
  exportEmployeesTemplate: async (req, res) => {
    try {
      const [[offices], [positions], [visaTypes], [platforms]] = await Promise.all([
        req.db.query('SELECT id, name FROM offices'),
        req.db.query('SELECT id, title FROM positions'),
        req.db.query('SELECT id, typeofvisa FROM visa_types'),
        req.db.query('SELECT id, platform_name FROM platforms')
      ]);
      // Helper function to format template dates as DD/MM/YYYY
      const formatTemplateDate = (dateStr) => {
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          
          // Format as DD/MM/YYYY for Excel templates
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          
          return `${day}/${month}/${year}`;
        } catch (error) {
          return dateStr;
        }
      };
      
      const template = [{
        // Basic Info (Required fields first)
        'Employee ID': '999', // Placeholder for new employee ID
        'First Name': 'John',
        'Last Name': 'Smith', 
        'Nationality': 'Indian',
        'Email': 'john.smith@example.com',
        
        // Employment Info (Required)
        'Office ID': 19,
        'Position ID': 21,
        'Salary': 4000,
        'Joining Date': formatTemplateDate('2023-01-01'), // Shows 01/01/2023 and imports as 01-01-2023
        'Status': 'active',
        
        // Personal Info
        'DOB': formatTemplateDate('1990-01-15'), // Shows 15/01/1990 and imports as 15-01-1990
        'Gender': 'Male',
        'Phone': '+971501234567',
        'WhatsApp': '+971507891234',
        'Marital Status': 'Single',
        'Primary Language': 'English',
        'Secondary Language': 'Arabic',
        
        // Documents & Visa
        'Passport Number': 'P1234567',
        'Passport Expiry': formatTemplateDate('2030-01-01'), // Shows 01/01/2030 and imports as 01-01-2030
        'Visa Type': 1,
        'Visa Expiry': formatTemplateDate('2030-12-31'), // Shows 31/12/2030 and imports as 31-12-2030
        'Hiring Source': 'Job Portal',
        
        // Emergency Contact
        
        'Emergency Contact Relation': 'Father +971509876543',
        
        // Address Information
        'Current Address': '456 Current Street, Dubai',
        
        
        // Work & Platform
        'Platform': 1,
        
        // Additional Information
        'Salary Currency': 'AED',
      
      }];
      
      console.log('📋 Template dates formatted as DD/MM/YYYY:', {
        'Joining Date': template[0]['Joining Date'],
        'DOB': template[0]['DOB'],
        'Passport Expiry': template[0]['Passport Expiry'],
        'Visa Expiry': template[0]['Visa Expiry']
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(template), 'Template');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offices), 'Offices');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(positions), 'Positions');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(visaTypes), 'VisaTypes');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(platforms), 'Platforms');
      res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.end(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // -- The rest of your CRUD and summary functions (with office-based filtering) --
  getEmployees: async (req, res) => {
    try {
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'e');
      
      let sql = `
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      `;
      
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      
      sql += ` ORDER BY e.employeeId`;
      
      const [employees] = await req.db.query(sql, params);
      const processedEmployees = employees.map(emp => {
        return {
          ...emp,
          status: emp.status === 1 || emp.status === true || emp.status === 'active',
          position_name: emp.position_title,
          // Return dates formatted as DD/MM/YYYY for frontend display
          joiningDate: formatDateForDisplay(emp.joiningDate),
          dob: formatDateForDisplay(emp.dob),
          passport_expiry: formatDateForDisplay(emp.passport_expiry),
          visa_expiry: formatDateForDisplay(emp.visa_expiry)
        };
      });
      res.json(processedEmployees);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  },
  getNextEmployeeId: async (req, res) => {
    res.status(400).json({ error: 'Auto-generation of employeeId is disabled. Please provide employeeId manually.' });
  },
  getOfficePositionData: async (req, res) => {
    try {
      const { officeId, positionId } = req.params;
      const [result] = await req.db.query(`
        SELECT reporting_time, duty_hours 
        FROM office_positions 
        WHERE office_id = ? AND position_id = ?
      `, [officeId, positionId]);
      if (result.length > 0) {
        let reportingTime = result[0].reporting_time;
        if (typeof reportingTime === 'string' && reportingTime.includes(':')) {
          const [hours, minutes] = reportingTime.split(':');
          reportingTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        res.json({
          reporting_time: reportingTime || 'Not set',
          duty_hours: result[0].duty_hours ? `${result[0].duty_hours} hours` : 'Not set'
        });
      } else {
        res.json({ reporting_time: 'Not set', duty_hours: 'Not set' });
      }
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getEmployeeCount: async (req, res) => {
    try {
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'e');
      
      let sql = 'SELECT COUNT(*) AS total FROM employees e';
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      
      const [result] = await req.db.query(sql, params);
      res.json({ total: result[0].total });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getTotalMonthlySalary: async (req, res) => {
    try {
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'e');
      
      let sql = 'SELECT SUM(monthlySalary) AS totalSalary FROM employees e WHERE e.status = 1';
      if (whereClause) {
        sql += ` AND ${whereClause}`;
      }
      
      const [result] = await req.db.query(sql, params);
      res.json({ totalSalary: result[0].totalSalary || 0 });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getSummaryByOffice: async (req, res) => {
    try {
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'o');
      
      let sql = `
        SELECT o.id AS office_id, o.name AS office,
          COUNT(e.id) AS totalEmployees,
          SUM(e.monthlySalary) AS totalSalary
        FROM offices o
        LEFT JOIN employees e ON o.id = e.office_id AND e.status = 1
      `;
      
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      
      sql += ` GROUP BY o.id`;
      
      const [results] = await req.db.query(sql, params);
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getOfficeOptions: async (req, res) => {
    try {
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'o');
      
      let sql = 'SELECT o.id, o.name FROM offices o';
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      sql += ' ORDER BY o.name';
      
      const [results] = await req.db.query(sql, params);
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getPositionOptions: async (req, res) => {
    try {
      const [results] = await req.db.query('SELECT id, title FROM positions ORDER BY title');
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getPositionsByOffice: async (req, res) => {
    try {
      const { officeId } = req.params;
      const [results] = await req.db.query(`
        SELECT DISTINCT p.id, p.title 
        FROM positions p
        INNER JOIN office_positions op ON p.id = op.position_id
        WHERE op.office_id = ?
        ORDER BY p.title
      `, [officeId]);
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getPlatformOptions: async (req, res) => {
    try {
      const [results] = await req.db.query('SELECT id, platform_name FROM platforms ORDER BY platform_name');
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  createEmployee: async (req, res) => {
    try {
      console.log('🔍 CREATE - Raw request body:', req.body);
      const { employeeId, name, first_name, last_name, nationality, email, office_name, position_name, monthlySalary, joiningDate, status,
        dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
        primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact, emergency_contact_relation } = req.body;
      
      console.log('🔍 CREATE - Extracted fields:');
      console.log('  - first_name:', first_name);
      console.log('  - last_name:', last_name);
      console.log('  - nationality:', nationality);
      console.log('  - emergency_contact_relation:', emergency_contact_relation);
      console.log('  - joiningDate (raw):', joiningDate);
      
      if (!employeeId || !office_name || !position_name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const db = req.db;
      const office_id = await getOfficeIdByName(office_name, db);
      
      // Check if user has access to this office
      if (req.userOffices && req.userOffices.length > 0 && req.user.role !== 'admin') {
        if (!req.userOffices.includes(office_id)) {
          return res.status(403).json({ error: 'Access denied: You do not have permission to create employees in this office' });
        }
      }
      
      const position_id = await getPositionIdByName(position_name, db);
      let statusValue = 1;
      if (typeof status === 'boolean') statusValue = status ? 1 : 0;
      else if (typeof status === 'string') statusValue = (status === 'true' || status.toLowerCase() === 'active') ? 1 : 0;
      else if (typeof status === 'number') statusValue = status;
      
      // Simple date handling without timezone manipulation
      const safeFormatDate = (dateStr) => {
        if (!dateStr) return null;
        
        console.log(`🔍 SafeFormatDate processing: '${dateStr}' (type: ${typeof dateStr})`);
        
        try {
          let parsedDate;
          
          // Handle different input formats
          if (typeof dateStr === 'string') {
            // Remove any time portion first
            const dateOnly = dateStr.split('T')[0].split(' ')[0];
            
            // Try to create a date from the string
            if (dateOnly.includes('/')) {
              // Handle DD/MM/YYYY or MM/DD/YYYY format
              const parts = dateOnly.split('/');
              if (parts.length === 3) {
                // Assume DD/MM/YYYY format (more common)
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // Month is 0-indexed in Date
                const year = parseInt(parts[2]);
                parsedDate = new Date(year, month, day);
              } else {
                parsedDate = new Date(dateStr);
              }
            } else {
              parsedDate = new Date(dateStr);
            }
          } else {
            parsedDate = new Date(dateStr);
          }
          
          if (isNaN(parsedDate.getTime())) {
            console.warn(`❌ Invalid date: ${dateStr}`);
            return null;
          }
          
          // Format as YYYY-MM-DD without any manipulation
          const year = parsedDate.getFullYear();
          const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
          const day = parsedDate.getDate().toString().padStart(2, '0');
          
          const result = `${year}-${month}-${day}`;
          console.log(`✅ Date formatted: ${dateStr} → ${result}`);
          return result;
          
        } catch (error) {
          console.warn(`❌ Error parsing date '${dateStr}':`, error.message);
          return null;
        }
      };
      
      const fixedJoiningDate = safeFormatDate(joiningDate);
      const fixedDob = safeFormatDate(dob);
      const fixedPassportExpiry = safeFormatDate(passport_expiry);
      const fixedVisaExpiry = safeFormatDate(visa_expiry);
      
      console.log('🔍 CREATE - Processed dates:');
      console.log('  - joiningDate:', joiningDate, '->', fixedJoiningDate);
      console.log('  - dob:', dob, '->', fixedDob);
      console.log('  - passport_expiry:', passport_expiry, '->', fixedPassportExpiry);
      console.log('  - visa_expiry:', visa_expiry, '->', fixedVisaExpiry);
      
      // First try to add the columns if they don't exist
      try {
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(50) NULL`);
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(50) NULL`);
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) NULL`);
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50) NULL`);
        console.log('✅ Columns added or already exist');
      } catch (alterError) {
        console.log('⚠️ Column alteration failed (columns might already exist):', alterError.message);
      }
      
      await db.query(`
        INSERT INTO employees 
        (employeeId, name, first_name, last_name, nationality, email, office_id, position_id, monthlySalary, joiningDate, status,
          dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
          primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact, emergency_contact_relation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId, name, first_name || null, last_name || null, nationality || null, email, office_id, position_id, monthlySalary, fixedJoiningDate, statusValue,
        fixedDob, passport_number || null, fixedPassportExpiry, visa_type || null, fixedVisaExpiry, platform || null, address || null, current_address || null, phone || null, whatsapp || null, gender || null,
        primary_language || null, secondary_language || null, marital_status || null, hiring_source || null, salary_currency || 'AED', emirates_id || null, emergency_contact || null, emergency_contact_relation || null
      ]);
      const [newEmployee] = await db.query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [employeeId]);
      const employee = newEmployee[0];
      employee.status = employee.status === 1;
      employee.position_name = employee.position_title;
      
      // Return dates formatted as DD/MM/YYYY for frontend display
      employee.joiningDate = formatDateForDisplay(employee.joiningDate);
      employee.dob = formatDateForDisplay(employee.dob);
      employee.passport_expiry = formatDateForDisplay(employee.passport_expiry);
      employee.visa_expiry = formatDateForDisplay(employee.visa_expiry);
      
      res.status(201).json(employee);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  getEmployeeById: async (req, res) => {
    try {
      const [employee] = await req.db.query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);
      if (employee[0]) {
        const emp = employee[0];
        emp.status = emp.status === 1;
        emp.position_name = emp.position_title;
        
        // Return dates formatted as DD/MM/YYYY for frontend display
        emp.joiningDate = formatDateForDisplay(emp.joiningDate);
        emp.dob = formatDateForDisplay(emp.dob);
        emp.passport_expiry = formatDateForDisplay(emp.passport_expiry);
        emp.visa_expiry = formatDateForDisplay(emp.visa_expiry);
        
        res.json(emp);
      } else {
        res.status(404).json({ error: 'Employee not found' });
      }
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  updateEmployee: async (req, res) => {
    try {
      console.log('🔍 UPDATE - Raw request body:', req.body);
      const {
        name, first_name, last_name, nationality, email, office_name, position_name, monthlySalary, joiningDate, status,
        dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
        primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact, emergency_contact_relation
      } = req.body;
      
      console.log('🔍 UPDATE - Extracted fields:');
      console.log('  - first_name:', first_name);
      console.log('  - last_name:', last_name);
      console.log('  - nationality:', nationality);
      console.log('  - emergency_contact_relation:', emergency_contact_relation);
      console.log('  - joiningDate (raw):', joiningDate);
      
      const db = req.db;
      const office_id = await getOfficeIdByName(office_name, db);
      const position_id = await getPositionIdByName(position_name, db);
      let statusValue = 1;
      if (typeof status === 'boolean') statusValue = status ? 1 : 0;
      else if (typeof status === 'string') statusValue = (status === 'true' || status.toLowerCase() === 'active') ? 1 : 0;
      else if (typeof status === 'number') statusValue = status;
      
      // Simple date handling without timezone manipulation
      const safeFormatDate = (dateStr) => {
        if (!dateStr) return null;
        
        console.log(`🔍 UPDATE SafeFormatDate processing: '${dateStr}' (type: ${typeof dateStr})`);
        
        try {
          let parsedDate;
          
          // Handle different input formats
          if (typeof dateStr === 'string') {
            // Remove any time portion first
            const dateOnly = dateStr.split('T')[0].split(' ')[0];
            
            // Try to create a date from the string
            if (dateOnly.includes('/')) {
              // Handle DD/MM/YYYY or MM/DD/YYYY format
              const parts = dateOnly.split('/');
              if (parts.length === 3) {
                // Assume DD/MM/YYYY format (more common)
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // Month is 0-indexed in Date
                const year = parseInt(parts[2]);
                parsedDate = new Date(year, month, day);
              } else {
                parsedDate = new Date(dateStr);
              }
            } else {
              parsedDate = new Date(dateStr);
            }
          } else {
            parsedDate = new Date(dateStr);
          }
          
          if (isNaN(parsedDate.getTime())) {
            console.warn(`❌ UPDATE Invalid date: ${dateStr}`);
            return null;
          }
          
          // Format as YYYY-MM-DD without any manipulation
          const year = parsedDate.getFullYear();
          const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
          const day = parsedDate.getDate().toString().padStart(2, '0');
          
          const result = `${year}-${month}-${day}`;
          console.log(`✅ UPDATE Date formatted: ${dateStr} → ${result}`);
          return result;
          
        } catch (error) {
          console.warn(`❌ UPDATE Error parsing date '${dateStr}':`, error.message);
          return null;
        }
      };
      
      const fixedJoiningDate = safeFormatDate(joiningDate);
      const fixedDob = safeFormatDate(dob);
      const fixedPassportExpiry = safeFormatDate(passport_expiry);
      const fixedVisaExpiry = safeFormatDate(visa_expiry);
      
      console.log('🔍 UPDATE - Processed dates:');
      console.log('  - joiningDate:', joiningDate, '->', fixedJoiningDate);
      console.log('  - dob:', dob, '->', fixedDob);
      console.log('  - passport_expiry:', passport_expiry, '->', fixedPassportExpiry);
      console.log('  - visa_expiry:', visa_expiry, '->', fixedVisaExpiry);
      
      // Ensure columns exist before updating
      try {
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(50) NULL`);
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(50) NULL`);
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) NULL`);
        await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50) NULL`);
        console.log('✅ Columns verified or added');
      } catch (alterError) {
        console.log('⚠️ Column verification failed (columns might already exist):', alterError.message);
      }
      
      const [result] = await db.query(`
        UPDATE employees SET
          name = ?, first_name = ?, last_name = ?, nationality = ?, email = ?, office_id = ?, position_id = ?,
          monthlySalary = ?, joiningDate = ?, status = ?,
          dob = ?, passport_number = ?, passport_expiry = ?, visa_type = ?, visa_expiry = ?, platform = ?, address = ?, current_address = ?, phone = ?, whatsapp = ?, gender = ?,
          primary_language = ?, secondary_language = ?, marital_status = ?, hiring_source = ?, salary_currency = ?, emirates_id = ?, emergency_contact = ?, emergency_contact_relation = ?
        WHERE employeeId = ?
      `, [
        name, first_name || null, last_name || null, nationality || null, email, office_id, position_id, monthlySalary, fixedJoiningDate, statusValue,
        fixedDob, passport_number || null, fixedPassportExpiry, visa_type || null, fixedVisaExpiry, platform || null, address || null, current_address || null, phone || null, whatsapp || null, gender || null,
        primary_language || null, secondary_language || null, marital_status || null, hiring_source || null, salary_currency || 'AED', emirates_id || null, emergency_contact || null, emergency_contact_relation || null,
        req.params.employeeId
      ]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Employee not found' });
      const [updatedEmployee] = await db.query(`
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `, [req.params.employeeId]);
      const employee = updatedEmployee[0];
      employee.status = employee.status === 1;
      employee.position_name = employee.position_title;
      
      // Return dates formatted as DD/MM/YYYY for frontend display
      employee.joiningDate = formatDateForDisplay(employee.joiningDate);
      employee.dob = formatDateForDisplay(employee.dob);
      employee.passport_expiry = formatDateForDisplay(employee.passport_expiry);
      employee.visa_expiry = formatDateForDisplay(employee.visa_expiry);
      
      res.json(employee);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  deleteEmployee: async (req, res) => {
    try {
      const [result] = await req.db.query('DELETE FROM employees WHERE employeeId = ?', [req.params.employeeId]);
      if (result.affectedRows) {
        res.json({ message: 'Employee deleted successfully' });
      } else {
        res.status(404).json({ error: 'Employee not found' });
      }
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getSummaryByPlatform: async (req, res) => {
    try {
      const sql = `
        SELECT p.id AS platform_id, p.platform_name AS platform,
          COUNT(e.id) AS totalEmployees,
          SUM(e.monthlySalary) AS totalSalary
        FROM platforms p
        LEFT JOIN employees e ON p.platform_name = e.platform AND e.status = 1
        GROUP BY p.id, p.platform_name
        ORDER BY p.platform_name
      `;

      const [results] = await req.db.query(sql);
      res.json(results);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Export employees to Excel with same format as database
  exportEmployees: async (req, res) => {
    try {
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'e');
      
      let sql = `
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      `;
      
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      
      sql += ` ORDER BY CAST(e.employeeId AS UNSIGNED), e.employeeId`;
      
      const [employees] = await req.db.query(sql, params);
      
      // Helper function to convert dates to Excel serial numbers
      const dateToExcelSerial = (dateStr) => {
        if (!dateStr) return null;
        
        try {
          let date;
          
          // Handle different input formats
          if (typeof dateStr === 'string') {
            // If it's already in YYYY-MM-DD format (from database)
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              date = new Date(dateStr + 'T00:00:00');
            }
            // If it's in YYYY/MM/DD format
            else if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
              date = new Date(dateStr + 'T00:00:00');
            }
            // If it's in DD/MM/YYYY format, parse correctly
            else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
              const [day, month, year] = dateStr.split('/');
              date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
            // Try to parse as a general date
            else {
              date = new Date(dateStr + 'T00:00:00');
            }
          } else {
            date = new Date(dateStr);
          }
          
          // Return Excel serial number or null
          if (date && !isNaN(date.getTime())) {
            // Excel date serial calculation (1900-based system)
            const EXCEL_EPOCH = new Date(1899, 11, 30); // December 30, 1899
            const MS_PER_DAY = 86400000;
            
            const timeDiff = date.getTime() - EXCEL_EPOCH.getTime();
            const excelSerial = Math.floor(timeDiff / MS_PER_DAY) + 1;
            
            console.log(`📅 Date conversion: ${dateStr} → Excel serial ${excelSerial}`);
            return excelSerial;
          }
          
          return null;
        } catch (error) {
          console.warn(`Warning: Could not parse date '${dateStr}':`, error.message);
          return null;
        }
      };
      
      // Format data for export - EXACT columns in EXACT order as requested (removed Full Name)
      console.log('🚀 Using NEW Excel export with 25 columns and auto-filters!');
      const exportData = employees.map(emp => ({
        'Employee ID': emp.employeeId,
        'First Name': emp.first_name || '',
        'Last Name': emp.last_name || '',
        'Date of Birth': dateToExcelSerial(emp.dob),
        'Date of Joining': dateToExcelSerial(emp.joiningDate),
        'Nationality': emp.nationality || '',
        'Passport Number': emp.passport_number || '',
        'Passport Expiry': dateToExcelSerial(emp.passport_expiry),
        'Visa Type': emp.visa_type_name || emp.visa_type || '',
        'Visa Expiry': dateToExcelSerial(emp.visa_expiry),
        'Office': emp.office_name || '',
        'Platform': emp.platform || '',
        'Position': emp.position_title || '',
        'Monthly Salary': emp.monthlySalary || 0,
        'Email': emp.email || '',
        'Phone': emp.phone || '',
        'WhatsApp': emp.whatsapp || '',
        'Gender': emp.gender || '',
        'Marital Status': emp.marital_status || '',
        'Primary Language': emp.primary_language || '',
        'Secondary Language': emp.secondary_language || '',
        'Hiring Source': emp.hiring_source || '',
        'Current Address': emp.current_address || '',
        'Emergency Contact Relation': emp.emergency_contact_relation || '',
        'Emergency Contact': emp.emergency_contact || '',
        'Status': emp.status === 1 ? 'Active' : 'Inactive'
      }));
      
      // Create Excel file with enhanced formatting and auto-filters
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Post-process the worksheet to set date cell types and formatting for proper sorting
      const dateColumns = ['D', 'E', 'H', 'J']; // Date of Birth, Date of Joining, Passport Expiry, Visa Expiry
      for (let row = 2; row <= exportData.length + 1; row++) {
        for (const col of dateColumns) {
          const cellRef = `${col}${row}`;
          if (ws[cellRef] && ws[cellRef].v && typeof ws[cellRef].v === 'number') {
            // Set as date type with proper formatting for Excel sorting
            ws[cellRef].t = 'd'; // Date type (not number)
            ws[cellRef].z = 'dd/mm/yyyy'; // DD/MM/YYYY format
            
            // Convert Excel serial number back to JavaScript Date object
            const EXCEL_EPOCH = new Date(1899, 11, 30);
            const MS_PER_DAY = 86400000;
            const dateValue = new Date(EXCEL_EPOCH.getTime() + (ws[cellRef].v * MS_PER_DAY));
            
            // Set the cell value as a Date object for proper Excel recognition
            ws[cellRef].v = dateValue;
            
            console.log(`📅 Cell ${cellRef}: Serial ${ws[cellRef].v} → Date object for sorting`);
          }
        }
      }
      
      // Set column widths for better visibility - Updated for 25 columns (removed Full Name)
      const columnWidths = [
        { wch: 12 }, // Employee ID
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 14 }, // Date of Birth
        { wch: 14 }, // Date of Joining
        { wch: 12 }, // Nationality
        { wch: 15 }, // Passport Number
        { wch: 14 }, // Passport Expiry
        { wch: 12 }, // Visa Type
        { wch: 14 }, // Visa Expiry
        { wch: 20 }, // Office
        { wch: 15 }, // Platform
        { wch: 18 }, // Position
        { wch: 15 }, // Monthly Salary
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // WhatsApp
        { wch: 10 }, // Gender
        { wch: 15 }, // Marital Status
        { wch: 15 }, // Primary Language
        { wch: 15 }, // Secondary Language
        { wch: 15 }, // Hiring Source
        { wch: 30 }, // Current Address
        { wch: 20 }, // Emergency Contact Relation
        { wch: 18 }, // Emergency Contact
        { wch: 10 }  // Status
      ];
      
      ws['!cols'] = columnWidths;
      
      // Add freeze panes to keep headers visible when scrolling
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      
      // 🔧 ENHANCED AUTO-FILTER IMPLEMENTATION - Guaranteed filter dropdowns
      if (exportData.length > 0) {
        const numCols = Object.keys(exportData[0]).length;
        const numRows = exportData.length;
        
        // Calculate range properly - from A1 to last column and last row with data
        const filterRange = `A1:${XLSX.utils.encode_col(numCols - 1)}${numRows + 1}`;
        
        // Apply auto-filter to the entire data range
        ws['!autofilter'] = { ref: filterRange };
        
        // Style the headers for better filter visibility
        for (let col = 0; col < numCols; col++) {
          const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
          if (ws[headerCell]) {
            ws[headerCell].s = {
              font: { bold: true },
              alignment: { horizontal: 'center' },
              fill: { fgColor: { rgb: 'E6E6FA' } } // Light lavender background
            };
          }
        }
        
        console.log(`✅ Auto-filter applied to range: ${filterRange}`);
        console.log(`📊 Excel file with ${numCols} columns and ${numRows + 1} rows (including header)`);
      }
      
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      
      // Set response headers for file download with cache-busting
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `employees_${timestamp}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Add cache-busting headers to prevent any caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `"${Date.now()}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
      
      // Generate Excel file with enhanced options
      const excelBuffer = XLSX.write(wb, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true // Enable compression for smaller files
      });
      
      // Send the Excel file
      res.end(excelBuffer);
      
      console.log(`🎉 Excel export completed: ${fileName} with auto-filters enabled`);
      
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ error: 'Failed to export employees: ' + err.message });
    }
  }
};
