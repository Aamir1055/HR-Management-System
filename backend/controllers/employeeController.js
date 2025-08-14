const XLSX = require('xlsx');
const fs = require('fs');

// --- Helpers ---
function excelDateToJSDate(serial) {
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / 3600);
    const minutes = Math.floor(total_seconds / 60) % 60;
    const d = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    return d.toISOString().split('T')[0];
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
  const [visaType] = await db.query('SELECT id FROM visa_types WHERE name = ?', [visa_type_name]);
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

      const requiredColumns = [
        'Employee ID', 'Name', 'Email', 'Office ID', 'Position ID', 'Salary', 'Joining Date', 'Status'
      ];
      if (data[0]) {
        for (const col of requiredColumns) {
          if (!(col in data[0])) throw new Error(`Required column "${col}" not found in Excel file`);
        }
      } else throw new Error('Excel file has no data');

      const processed = [];
      for (const row of data) {
        // Log raw row
        console.log('[IMPORT] Raw Excel row:', row);

        if (!row['Employee ID'] || !row['Office ID'] || !row['Position ID']) continue;
        try {
          const office_id = Number(row['Office ID']);
          const position_id = Number(row['Position ID']);
          if (isNaN(office_id) || isNaN(position_id)) {
            throw new Error(`Invalid Office ID or Position ID for employee ${row['Employee ID']}`);
          }
          let statusValue = 1;
          if (typeof row['Status'] === 'string') {
            statusValue = (row['Status'].toLowerCase() === 'active') ? 1 : 0;
          } else if (typeof row['Status'] === 'boolean') {
            statusValue = row['Status'] ? 1 : 0;
          } else if (typeof row['Status'] === 'number') {
            statusValue = row['Status'];
          }

          // Parse secondary date fields with explicit logging
          const joiningDateRaw = row['Joining Date'];
          const joiningDate = excelDateToJSDate(joiningDateRaw);
          const dobRaw = row['DOB'];
          const dobParsed = dobRaw ? excelDateToJSDate(dobRaw) : null;
          const passportExpiryRaw = row['Passport Expiry'];
          const passportExpiryParsed = passportExpiryRaw ? excelDateToJSDate(passportExpiryRaw) : null;
          const visaExpiryRaw = row['Visa Expiry'];
          const visaExpiryParsed = visaExpiryRaw ? excelDateToJSDate(visaExpiryRaw) : null;

          // Parse visa type - convert ID to name
          let visaTypeName = null;
          if (row['Visa Type']) {
            const visaTypeId = Number(row['Visa Type']);
            if (isNaN(visaTypeId)) {
              console.warn(`[IMPORT] Warning: Invalid Visa Type ID '${row['Visa Type']}' for employee ${row['Employee ID']}`);
              visaTypeName = null;
            } else {
              // Get visa type name from database
              const [visaTypeResult] = await db.query('SELECT typeofvisa FROM visa_types WHERE id = ?', [visaTypeId]);
              if (visaTypeResult && visaTypeResult[0]) {
                visaTypeName = visaTypeResult[0].typeofvisa;
              } else {
                console.warn(`[IMPORT] Warning: No visa type found for ID '${visaTypeId}' for employee ${row['Employee ID']}`);
                visaTypeName = null;
              }
            }
          }

          // Parse platform - convert ID to name (similar to visa type)
          let platformName = null;
          if (row['Platform']) {
            const platformId = Number(row['Platform']);
            if (isNaN(platformId)) {
              console.warn(`[IMPORT] Warning: Invalid Platform ID '${row['Platform']}' for employee ${row['Employee ID']}`);
              platformName = null;
            } else {
              // Get platform name from database
              const [platformResult] = await db.query('SELECT platform_name FROM platforms WHERE id = ?', [platformId]);
              if (platformResult && platformResult[0]) {
                platformName = platformResult[0].platform_name;
              } else {
                console.warn(`[IMPORT] Warning: No platform found for ID '${platformId}' for employee ${row['Employee ID']}`);
                platformName = null;
              }
            }
          }

          // Log conversions
          console.log(`[IMPORT] Employee ${row['Employee ID']}:
            Joining Date raw='${joiningDateRaw}' parsed='${joiningDate}'
            DOB raw='${dobRaw}' parsed='${dobParsed}'
            Passport Expiry raw='${passportExpiryRaw}' parsed='${passportExpiryParsed}'
            Visa Type raw='${row['Visa Type']}' resolved name='${visaTypeName}'
            Platform raw='${row['Platform']}' resolved name='${platformName}'
          `);

          processed.push([
            row['Employee ID'],
            row['Name'],
            row['Email'],
            office_id,
            position_id,
            row['Salary'],
            joiningDate,
            statusValue,
            dobParsed,
            row['Passport Number'] || null,
            passportExpiryParsed,
            visaTypeName,
            platformName,
            row['Address'] || null,
            row['Current Address'] || null,
            row['Phone'] || null,
            row['Gender'] || null,
            // New fields
            row['WhatsApp'] || null,
            visaExpiryParsed,
            row['Primary Language'] || null,
            row['Secondary Language'] || null,
            row['Marital Status'] || null,
            row['Hiring Source'] || null,
            row['Salary Currency'] || 'AED',
            row['Emirates ID'] || null,
            row['Emergency Contact'] || null
          ]);
        } catch (error) {
          console.error('[IMPORT] Error in row:', error);
          throw new Error(`Error processing employee ${row['Employee ID']}: ${error.message}`);
        }
      }
      if (processed.length > 0) {
        const placeholders = processed.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = processed.flat();
        const sql = `
          INSERT INTO employees 
          (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status,
            dob, passport_number, passport_expiry, visa_type, platform, address, current_address, phone, gender,
            whatsapp, visa_expiry, primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact)
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
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
            platform = VALUES(platform),
            address = VALUES(address),
            current_address = VALUES(current_address),
            phone = VALUES(phone),
            gender = VALUES(gender),
            whatsapp = VALUES(whatsapp),
            visa_expiry = VALUES(visa_expiry),
            primary_language = VALUES(primary_language),
            secondary_language = VALUES(secondary_language),
            marital_status = VALUES(marital_status),
            hiring_source = VALUES(hiring_source),
            salary_currency = VALUES(salary_currency),
            emirates_id = VALUES(emirates_id),
            emergency_contact = VALUES(emergency_contact)
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
        if ('Date of Birth' in row) {
          const dob = row['Date of Birth'] ? excelDateToJSDate(row['Date of Birth']) : null;
          console.log(`[SEC IMPORT] ${employeeId}: DOB raw='${row['Date of Birth']}', parsed='${dob}'`);
          fields.push('dob = ?'); values.push(dob);
        }
        if ('Passport Number' in row) fields.push('passport_number = ?'), values.push(row['Passport Number'] || null);
        if ('Passport Expiry' in row) {
          const pe = row['Passport Expiry'] ? excelDateToJSDate(row['Passport Expiry']) : null;
          console.log(`[SEC IMPORT] ${employeeId}: Passport Expiry raw='${row['Passport Expiry']}', parsed='${pe}'`);
          fields.push('passport_expiry = ?'); values.push(pe);
        }
        if ('Visa Type' in row) {
          let visaTypeName = null;
          if (row['Visa Type']) {
            const visaTypeId = Number(row['Visa Type']);
            if (isNaN(visaTypeId)) {
              console.warn(`[SEC IMPORT] Warning: Invalid Visa Type ID '${row['Visa Type']}' for employee ${employeeId}`);
              visaTypeName = null;
            } else {
              // Get visa type name from database
              const [visaTypeResult] = await db.query('SELECT typeofvisa FROM visa_types WHERE id = ?', [visaTypeId]);
              if (visaTypeResult && visaTypeResult[0]) {
                visaTypeName = visaTypeResult[0].typeofvisa;
              } else {
                console.warn(`[SEC IMPORT] Warning: No visa type found for ID '${visaTypeId}' for employee ${employeeId}`);
                visaTypeName = null;
              }
            }
          }
          fields.push('visa_type = ?');
          values.push(visaTypeName);
        }
        if ('Address' in row) fields.push('address = ?'), values.push(row['Address'] || null);
        if ('Current Address' in row) fields.push('current_address = ?'), values.push(row['Current Address'] || null);
        if ('Phone' in row) fields.push('phone = ?'), values.push(row['Phone'] || null);
        if ('WhatsApp' in row) fields.push('whatsapp = ?'), values.push(row['WhatsApp'] || null);
        if ('Gender' in row) fields.push('gender = ?'), values.push(row['Gender'] || null);
        if ('Primary Language' in row) fields.push('primary_language = ?'), values.push(row['Primary Language'] || null);
        if ('Secondary Language' in row) fields.push('secondary_language = ?'), values.push(row['Secondary Language'] || null);
        if ('Marital Status' in row) fields.push('marital_status = ?'), values.push(row['Marital Status'] || null);
        if ('Hiring Source' in row) fields.push('hiring_source = ?'), values.push(row['Hiring Source'] || null);
        if ('Salary Currency' in row) fields.push('salary_currency = ?'), values.push(row['Salary Currency'] || 'AED');
        if ('Emirates ID' in row) fields.push('emirates_id = ?'), values.push(row['Emirates ID'] || null);
        if ('Emergency Contact' in row) fields.push('emergency_contact = ?'), values.push(row['Emergency Contact'] || null);
        if ('Visa Expiry' in row) {
          const ve = row['Visa Expiry'] ? excelDateToJSDate(row['Visa Expiry']) : null;
          console.log(`[SEC IMPORT] ${employeeId}: Visa Expiry raw='${row['Visa Expiry']}', parsed='${ve}'`);
          fields.push('visa_expiry = ?'); values.push(ve);
        }
        if ('Platform' in row) {
          let platformName = null;
          if (row['Platform']) {
            const platformId = Number(row['Platform']);
            if (isNaN(platformId)) {
              console.warn(`[SEC IMPORT] Warning: Invalid Platform ID '${row['Platform']}' for employee ${employeeId}`);
              platformName = null;
            } else {
              // Get platform name from database
              const [platformResult] = await db.query('SELECT platform_name FROM platforms WHERE id = ?', [platformId]);
              if (platformResult && platformResult[0]) {
                platformName = platformResult[0].platform_name;
              } else {
                console.warn(`[SEC IMPORT] Warning: No platform found for ID '${platformId}' for employee ${employeeId}`);
                platformName = null;
              }
            }
          }
          fields.push('platform = ?');
          values.push(platformName);
        }
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
      const template = [{
        'Employee ID': 'EMP001',
        'Name': 'John Smith',
        'Email': 'john@example.com',
        'Office ID': 1,
        'Position ID': 2,
        'Salary': 4000,
        'Joining Date': '01-01-2023',
        'Status': 'active',
        'DOB': '1990-01-15',
        'Passport Number': 'P1234567',
        'Passport Expiry': '2030-01-01',
        'Visa Type': 1,
        'Visa Expiry': '2030-12-31',
        'Platform': 1,
        'Address': '123 Main Street',
        'Current Address': '456 Current Street',
        'Phone': '+971501234567',
        'WhatsApp': '+971507891234',
        'Gender': 'Male',
        'Primary Language': 'English',
        'Secondary Language': 'Arabic',
        'Marital Status': 'Single',
        'Hiring Source': 'Job Portal',
        'Salary Currency': 'AED',
        'Emirates ID': '784-1990-1234567-8',
        'Emergency Contact': '+971509876543'
      }];
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
      const processedEmployees = employees.map(emp => ({
        ...emp,
        status: emp.status === 1 || emp.status === true || emp.status === 'active',
        position_name: emp.position_title
      }));
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
      const { employeeId, name, email, office_name, position_name, monthlySalary, joiningDate, status,
        dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
        primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact } = req.body;
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
      await db.query(`
        INSERT INTO employees 
        (employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, status,
          dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
          primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId, name, email, office_id, position_id, monthlySalary, joiningDate, statusValue,
        dob || null, passport_number || null, passport_expiry || null, visa_type || null, visa_expiry || null, platform || null, address || null, current_address || null, phone || null, whatsapp || null, gender || null,
        primary_language || null, secondary_language || null, marital_status || null, hiring_source || null, salary_currency || 'AED', emirates_id || null, emergency_contact || null
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
      const {
        name, email, office_name, position_name, monthlySalary, joiningDate, status,
        dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
        primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact
      } = req.body;
      const db = req.db;
      const office_id = await getOfficeIdByName(office_name, db);
      const position_id = await getPositionIdByName(position_name, db);
      let statusValue = 1;
      if (typeof status === 'boolean') statusValue = status ? 1 : 0;
      else if (typeof status === 'string') statusValue = (status === 'true' || status.toLowerCase() === 'active') ? 1 : 0;
      else if (typeof status === 'number') statusValue = status;
      const [result] = await db.query(`
        UPDATE employees SET
          name = ?, email = ?, office_id = ?, position_id = ?,
          monthlySalary = ?, joiningDate = ?, status = ?,
          dob = ?, passport_number = ?, passport_expiry = ?, visa_type = ?, visa_expiry = ?, platform = ?, address = ?, current_address = ?, phone = ?, whatsapp = ?, gender = ?,
          primary_language = ?, secondary_language = ?, marital_status = ?, hiring_source = ?, salary_currency = ?, emirates_id = ?, emergency_contact = ?
        WHERE employeeId = ?
      `, [
        name, email, office_id, position_id, monthlySalary, joiningDate, statusValue,
        dob || null, passport_number || null, passport_expiry || null, visa_type || null, visa_expiry || null, platform || null, address || null, current_address || null, phone || null, whatsapp || null, gender || null,
        primary_language || null, secondary_language || null, marital_status || null, hiring_source || null, salary_currency || 'AED', emirates_id || null, emergency_contact || null,
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
  }
};
