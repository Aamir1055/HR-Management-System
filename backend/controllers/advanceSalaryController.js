/**
 * Advanced Salary Controller - Manages advance salary requests and Excel file uploads
 * Handles uploading, validating, and processing advance salary data for employees
 */
const db = require('../db');
const XLSX = require('xlsx');
const { logAudit } = require('../middleware/auditMiddleware');

// Helper function to get user's office names
async function getUserOfficeNames(req) {
  if (!req.userOffices || req.userOffices.length === 0) {
    return [];
  }
  
  try {
    const placeholders = req.userOffices.map(() => '?').join(',');
    const [offices] = await db.query(
      `SELECT name FROM offices WHERE id IN (${placeholders})`,
      req.userOffices
    );
    return offices.map(office => office.name);
  } catch (error) {
    console.error('Error fetching office names:', error);
    return [];
  }
}

// Helper function to format month-year from Excel data
function formatMonthYear(monthInput, yearInput) {
  if (!monthInput || !yearInput) return null;
  
  let month, year;
  
  // Handle month - can be number (1-12) or string
  if (typeof monthInput === 'number') {
    month = monthInput;
  } else if (typeof monthInput === 'string') {
    month = parseInt(monthInput.trim());
  }
  
  // Handle year - can be number or string
  if (typeof yearInput === 'number') {
    year = yearInput;
  } else if (typeof yearInput === 'string') {
    year = parseInt(yearInput.trim());
  }
  
  // Validate month (1-12)
  if (!month || month < 1 || month > 12) {
    return null;
  }
  
  // Validate year (reasonable range)
  if (!year || year < 2020 || year > 2030) {
    return null;
  }
  
  // Format as YYYY-MM
  const formattedMonth = month.toString().padStart(2, '0');
  return `${year}-${formattedMonth}`;
}

// Helper function to validate amount
function validateAmount(amount) {
  if (!amount) return null;
  
  let numAmount;
  if (typeof amount === 'number') {
    numAmount = amount;
  } else if (typeof amount === 'string') {
    // Remove any currency symbols and parse
    const cleanAmount = amount.replace(/[^\d.-]/g, '');
    numAmount = parseFloat(cleanAmount);
  }
  
  // Check if it's a valid positive number
  if (isNaN(numAmount) || numAmount <= 0) {
    return null;
  }
  
  return numAmount;
}

// Upload advance salary data from Excel
exports.upload = async (req, res) => {
  console.log('[AdvanceSalary] Upload endpoint hit. File:', req.file?.originalname);
  if (!req.file) {
    console.error('[AdvanceSalary] No file uploaded');
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    console.log('[AdvanceSalary] Reading Excel file:', req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    console.log('[AdvanceSalary] Sheet name:', sheetName);

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,
      header: 1 // Get array of arrays first to handle header mapping
    });
    
    // Skip empty rows and get headers
    const nonEmptyRows = data.filter(row => row.some(cell => cell && cell.toString().trim()));
    if (nonEmptyRows.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row');
    }
    
    const headers = nonEmptyRows[0];
    const dataRows = nonEmptyRows.slice(1);
    
    console.log('[AdvanceSalary] Headers found:', headers);
    console.log('[AdvanceSalary] Number of data rows:', dataRows.length);

    // Map headers to expected column names (case insensitive)
    const headerMap = {};
    const requiredColumns = ['EmployeeID', 'Month', 'Year', 'Amount'];
    
    headers.forEach((header, index) => {
      const normalizedHeader = header.toString().toLowerCase().trim();
      if (normalizedHeader.includes('employee') && normalizedHeader.includes('id')) {
        headerMap['EmployeeID'] = index;
      } else if (normalizedHeader === 'month') {
        headerMap['Month'] = index;
      } else if (normalizedHeader === 'year') {
        headerMap['Year'] = index;
      } else if (normalizedHeader.includes('amount') || normalizedHeader.includes('salary')) {
        headerMap['Amount'] = index;
      }
    });

    // Check if all required columns are found
    const missingColumns = requiredColumns.filter(col => headerMap[col] === undefined);
    if (missingColumns.length > 0) {
      throw new Error(`Required columns not found: ${missingColumns.join(', ')}. Expected columns: EmployeeID, Month, Year, Amount`);
    }

    // Get employees from user's accessible offices
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let employeeQuery = 'SELECT e.employeeId, e.name, e.office_id FROM employees e';
    if (whereClause) {
      employeeQuery += ` WHERE ${whereClause}`;
    }
    
    const [accessibleEmployees] = await db.query(employeeQuery, params);
    const accessibleEmployeeMap = new Map(accessibleEmployees.map(emp => [emp.employeeId, { name: emp.name, office_id: emp.office_id }]));

    const validRecords = [];
    const errors = [];
    const unauthorizedEmployeeIds = new Set();

    // Process each data row
    dataRows.forEach((row, rowIndex) => {
      const actualRowNumber = rowIndex + 2; // +2 because we start from row 2 (after header)
      
      const employeeId = row[headerMap['EmployeeID']];
      const month = row[headerMap['Month']];
      const year = row[headerMap['Year']];
      const amount = row[headerMap['Amount']];

      // Skip completely empty rows
      if (!employeeId && !month && !year && !amount) {
        return;
      }

      // Validate Employee ID
      if (!employeeId) {
        errors.push(`Row ${actualRowNumber}: Employee ID is required`);
        return;
      }

      const empIdStr = employeeId.toString().trim();
      if (!accessibleEmployeeMap.has(empIdStr)) {
        unauthorizedEmployeeIds.add(empIdStr);
        return;
      }

      // Validate and format month-year
      const monthYear = formatMonthYear(month, year);
      if (!monthYear) {
        errors.push(`Row ${actualRowNumber}: Invalid Month (${month}) or Year (${year}). Month should be 1-12, Year should be 2020-2030`);
        return;
      }

      // Validate amount
      const validAmount = validateAmount(amount);
      if (!validAmount) {
        errors.push(`Row ${actualRowNumber}: Invalid Amount (${amount}). Amount should be a positive number`);
        return;
      }

      validRecords.push({
        employee_id: empIdStr,
        month_year: monthYear,
        amount: validAmount,
        uploaded_by: req.user.username
      });
    });

    // Check for unauthorized employees
    if (unauthorizedEmployeeIds.size > 0) {
      const unauthorizedList = Array.from(unauthorizedEmployeeIds).join(', ');
      const userOfficeNames = await getUserOfficeNames(req);
      const officeNamesText = userOfficeNames.length > 0 ? userOfficeNames.join(' and ') : 'your assigned offices';
      
      const message = `Access Denied: You can only upload advance salary data for employees in ${officeNamesText}. The following Employee IDs are from other offices: ${unauthorizedList}. Please remove these employees from your file or contact your administrator for access.`;
      console.log(`[AdvanceSalary] ${message}`);
      return res.status(403).json({
        success: false,
        message,
        unauthorizedEmployeeIds: Array.from(unauthorizedEmployeeIds)
      });
    }

    // Check for validation errors
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors: errors
      });
    }

    if (validRecords.length === 0) {
      throw new Error('No valid records found after validation');
    }

    // Check for duplicates in the same upload
    const duplicateCheck = new Map();
    const duplicates = [];
    
    validRecords.forEach((record, index) => {
      const key = `${record.employee_id}-${record.month_year}`;
      if (duplicateCheck.has(key)) {
        duplicates.push(`Employee ${record.employee_id} for ${record.month_year} appears multiple times in the file`);
      } else {
        duplicateCheck.set(key, index);
      }
    });

    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate records found in upload file',
        errors: duplicates
      });
    }

    // Check for existing records in database
    if (validRecords.length > 0) {
      const existingCheckQuery = `
        SELECT employee_id, month_year 
        FROM advance_salary 
        WHERE (employee_id, month_year) IN (${validRecords.map(() => '(?, ?)').join(', ')})
      `;
      const existingCheckParams = validRecords.flatMap(r => [r.employee_id, r.month_year]);
      
      const [existingRecords] = await db.query(existingCheckQuery, existingCheckParams);
      
      if (existingRecords.length > 0) {
        const existingList = existingRecords.map(r => `Employee ${r.employee_id} for ${r.month_year}`).join(', ');
        return res.status(409).json({
          success: false,
          message: `Advance salary records already exist for: ${existingList}. Please remove these from your file or use update functionality instead.`,
          existingRecords: existingRecords
        });
      }
    }

    // Insert valid records
    const insertQuery = 'INSERT INTO advance_salary (employee_id, month_year, amount, uploaded_by) VALUES ?';
    const insertData = validRecords.map(r => [r.employee_id, r.month_year, r.amount, r.uploaded_by]);
    
    await db.query(insertQuery, [insertData]);

    res.json({ 
      success: true, 
      message: 'Advance salary data uploaded successfully', 
      recordsProcessed: validRecords.length 
    });
  } catch (err) {
    console.error('[AdvanceSalary] Upload failed:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
};

// Get all advance salary records
exports.getAll = async (req, res) => {
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `
      SELECT 
        a.*, 
        e.name as employee_name,
        o.name as office_name
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      LEFT JOIN offices o ON e.office_id = o.id
    `;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    sql += ` ORDER BY a.uploaded_date DESC, a.employee_id ASC`;
    
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get advance salary records for a specific employee
exports.getByEmployee = async (req, res) => {
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `
      SELECT 
        a.*, 
        e.name as employee_name,
        o.name as office_name
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE a.employee_id = ?
    `;
    let qParams = [req.params.employeeId];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
      qParams.push(...params);
    }
    
    sql += ` ORDER BY a.month_year DESC`;
    
    const [rows] = await db.query(sql, qParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Filter advance salary records by month-year
exports.filterByMonthYear = async (req, res) => {
  const { month_year } = req.query;
  
  if (!month_year) {
    return res.status(400).json({ message: 'month_year parameter is required (format: YYYY-MM)' });
  }

  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `
      SELECT 
        a.*, 
        e.name as employee_name,
        o.name as office_name
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE a.month_year = ?
    `;
    let qParams = [month_year];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
      qParams.push(...params);
    }
    
    sql += ` ORDER BY e.name ASC`;
    
    const [rows] = await db.query(sql, qParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create or update advance salary record
exports.createOrUpdate = async (req, res) => {
  const { employee_id, month_year, amount } = req.body;

  if (!employee_id || !month_year || !amount) {
    return res.status(400).json({ message: 'employee_id, month_year, and amount are required' });
  }

  // Validate month_year format
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month_year)) {
    return res.status(400).json({ message: 'month_year must be in YYYY-MM format' });
  }

  // Validate amount
  const validAmount = validateAmount(amount);
  if (!validAmount) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    // Check office access
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let employeeQuery = 'SELECT e.employeeId FROM employees e WHERE e.employeeId = ?';
    let queryParams = [employee_id];
    
    if (whereClause) {
      employeeQuery += ` AND ${whereClause}`;
      queryParams.push(...params);
    }
    
    const [empRows] = await db.query(employeeQuery, queryParams);
    if (empRows.length === 0) {
      return res.status(404).json({ message: 'Employee not found or access denied' });
    }

    // Check if this is update or create
    const [existing] = await db.query(
      'SELECT * FROM advance_salary WHERE employee_id = ? AND month_year = ?',
      [employee_id, month_year]
    );
    const isUpdate = existing.length > 0;

    // Insert or update using ON DUPLICATE KEY UPDATE
    await db.query(
      `INSERT INTO advance_salary (employee_id, month_year, amount, uploaded_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         amount = VALUES(amount),
         uploaded_by = VALUES(uploaded_by),
         uploaded_date = CURRENT_TIMESTAMP`,
      [employee_id, month_year, validAmount, req.user.username]
    );

    // Fetch the inserted/updated record
    const [rows] = await db.query(
      `SELECT 
        a.*, 
        e.name as employee_name,
        o.name as office_name
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE a.employee_id = ? AND a.month_year = ?`,
      [employee_id, month_year]
    );

    // Log audit entry (non-blocking)
    if (req.user) {
      try {
        await logAudit({
          userId: req.user.id,
          username: req.user.username,
          action: isUpdate ? 'UPDATE' : 'CREATE',
          entityType: 'advance_salary',
          entityId: rows[0]?.id,
          entityName: `${rows[0]?.employee_name || 'Employee'} - ${month_year}`,
          description: `${isUpdate ? 'Updated' : 'Created'} advance salary for ${rows[0]?.employee_name || employee_id} for ${month_year} - Amount: ${validAmount}`,
          oldValues: isUpdate ? existing[0] : null,
          newValues: rows[0],
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError);
        // Continue with response even if audit logging fails
      }
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get single advance salary record
exports.getOne = async (req, res) => {
  const { employeeId, monthYear } = req.params;
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let sql = `
      SELECT 
        a.*, 
        e.name as employee_name,
        o.name as office_name
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE a.employee_id = ? AND a.month_year = ?
    `;
    let queryParams = [employeeId, monthYear];
    
    if (whereClause) {
      sql += ` AND ${whereClause}`;
      queryParams.push(...params);
    }
    
    const [rows] = await db.query(sql, queryParams);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Advance salary record not found or access denied' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update advance salary record
exports.update = async (req, res) => {
  const { employeeId, monthYear } = req.params;
  const { amount } = req.body;

  // Validate amount
  const validAmount = validateAmount(amount);
  if (!validAmount) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  try {
    // Check office access first
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let checkQuery = `
      SELECT a.id 
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      WHERE a.employee_id = ? AND a.month_year = ?
    `;
    let checkParams = [employeeId, monthYear];
    
    if (whereClause) {
      checkQuery += ` AND ${whereClause}`;
      checkParams.push(...params);
    }
    
    const [checkRows] = await db.query(checkQuery, checkParams);
    if (checkRows.length === 0) {
      return res.status(404).json({ message: 'Record not found or access denied' });
    }

    // Get old data for audit log (optional)
    let oldData = null;
    try {
      const [data] = await db.query(
        `SELECT a.*, e.name as employee_name
         FROM advance_salary a 
         INNER JOIN employees e ON a.employee_id = e.employeeId 
         WHERE a.employee_id = ? AND a.month_year = ?`,
        [employeeId, monthYear]
      );
      oldData = data[0];
    } catch (auditError) {
      console.warn('Could not fetch old advance salary data for audit:', auditError.message);
    }

    // Update the record
    const [result] = await db.query(
      `UPDATE advance_salary 
       SET amount = ?, uploaded_by = ?, uploaded_date = CURRENT_TIMESTAMP 
       WHERE employee_id = ? AND month_year = ?`,
      [validAmount, req.user.username, employeeId, monthYear]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Fetch updated record
    const [rows] = await db.query(
      `SELECT 
        a.*, 
        e.name as employee_name,
        o.name as office_name
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE a.employee_id = ? AND a.month_year = ?`,
      [employeeId, monthYear]
    );
    
    // Log audit entry (non-blocking)
    if (req.user && oldData) {
      try {
        await logAudit({
          userId: req.user.id,
          username: req.user.username,
          action: 'UPDATE',
          entityType: 'advance_salary',
          entityId: rows[0]?.id,
          entityName: `${rows[0]?.employee_name || 'Employee'} - ${monthYear}`,
          description: `Updated advance salary for ${rows[0]?.employee_name || employeeId} for ${monthYear} - Old: ${oldData.amount}, New: ${validAmount}`,
          oldValues: oldData,
          newValues: rows[0],
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError);
        // Continue with response even if audit logging fails
      }
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete advance salary record
exports.remove = async (req, res) => {
  const { employeeId, monthYear } = req.params;
  try {
    // Check office access first
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let checkQuery = `
      SELECT a.id 
      FROM advance_salary a 
      INNER JOIN employees e ON a.employee_id = e.employeeId 
      WHERE a.employee_id = ? AND a.month_year = ?
    `;
    let checkParams = [employeeId, monthYear];
    
    if (whereClause) {
      checkQuery += ` AND ${whereClause}`;
      checkParams.push(...params);
    }
    
    const [checkRows] = await db.query(checkQuery, checkParams);
    if (checkRows.length === 0) {
      return res.status(404).json({ message: 'Record not found or access denied' });
    }

    // Get data before deletion for audit log (optional)
    let oldData = null;
    try {
      const [data] = await db.query(
        `SELECT a.*, e.name as employee_name
         FROM advance_salary a 
         INNER JOIN employees e ON a.employee_id = e.employeeId 
         WHERE a.employee_id = ? AND a.month_year = ?`,
        [employeeId, monthYear]
      );
      oldData = data[0];
    } catch (auditError) {
      console.warn('Could not fetch advance salary data for audit:', auditError.message);
    }

    // Delete the record
    const [result] = await db.query(
      'DELETE FROM advance_salary WHERE employee_id = ? AND month_year = ?',
      [employeeId, monthYear]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Log audit entry (non-blocking)
    if (req.user && oldData) {
      try {
        await logAudit({
          userId: req.user.id,
          username: req.user.username,
          action: 'DELETE',
          entityType: 'advance_salary',
          entityId: oldData.id,
          entityName: `${oldData.employee_name || 'Employee'} - ${monthYear}`,
          description: `Deleted advance salary for ${oldData.employee_name || employeeId} for ${monthYear} - Amount: ${oldData.amount}`,
          oldValues: oldData,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError);
        // Continue with response even if audit logging fails
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete all advance salary records for an employee
exports.removeAllForEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    // Check office access first
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    let checkQuery = `
      SELECT e.employeeId, e.name 
      FROM employees e 
      WHERE e.employeeId = ?
    `;
    let checkParams = [employeeId];
    
    if (whereClause) {
      checkQuery += ` AND ${whereClause}`;
      checkParams.push(...params);
    }
    
    const [checkRows] = await db.query(checkQuery, checkParams);
    if (checkRows.length === 0) {
      return res.status(404).json({ message: 'Employee not found or access denied' });
    }

    // Check if employee has advance salary records
    const [recordRows] = await db.query(
      'SELECT COUNT(*) as count FROM advance_salary WHERE employee_id = ?',
      [employeeId]
    );
    
    if (recordRows[0].count === 0) {
      return res.status(404).json({ message: 'No advance salary records found for this employee' });
    }

    // Delete all advance salary records for this employee
    const [result] = await db.query(
      'DELETE FROM advance_salary WHERE employee_id = ?',
      [employeeId]
    );
    
    res.json({ 
      success: true, 
      message: `Successfully deleted ${result.affectedRows} advance salary record(s) for employee ${checkRows[0].name}`,
      deletedRecords: result.affectedRows
    });
  } catch (err) {
    console.error('Error deleting employee advance salary records:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get advance salary summary for a specific employee
exports.getEmployeeSummary = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    // Check if employee exists and user has access
    let employeeQuery = `
      SELECT e.employeeId, e.name, o.name as office_name, e.monthlySalary as monthly_salary
      FROM employees e 
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE e.employeeId = ?
    `;
    let empParams = [employeeId];
    
    if (whereClause) {
      employeeQuery += ` AND ${whereClause}`;
      empParams.push(...params);
    }
    
    const [empRows] = await db.query(employeeQuery, empParams);
    if (empRows.length === 0) {
      return res.status(404).json({ message: 'Employee not found or access denied' });
    }
    
    const employee = {
      employee_id: empRows[0].employeeId,
      name: empRows[0].name,
      office: empRows[0].office_name,
      monthly_salary: empRows[0].monthly_salary
    };
    
    // Get advance salary summary
    const currentYear = new Date().getFullYear();
    const [summaryRows] = await db.query(`
      SELECT 
        COUNT(*) as total_advances,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN SUBSTRING(month_year, 1, 4) = ? THEN 1 END) as current_year_advances,
        COALESCE(SUM(CASE WHEN SUBSTRING(month_year, 1, 4) = ? THEN amount ELSE 0 END), 0) as current_year_amount,
        COALESCE(AVG(amount), 0) as average_amount,
        MAX(uploaded_date) as recent_advance_date
      FROM advance_salary 
      WHERE employee_id = ?
    `, [currentYear.toString(), currentYear.toString(), employeeId]);
    
    const summary = {
      total_advances: summaryRows[0].total_advances,
      total_amount: summaryRows[0].total_amount,
      current_year_advances: summaryRows[0].current_year_advances,
      current_year_amount: summaryRows[0].current_year_amount,
      average_amount: summaryRows[0].average_amount,
      recent_advance_date: summaryRows[0].recent_advance_date
    };
    
    res.json({ employee, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get advance salary history for a specific employee
exports.getEmployeeHistory = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    // Check if employee exists and user has access
    let checkQuery = `
      SELECT e.employeeId 
      FROM employees e 
      WHERE e.employeeId = ?
    `;
    let checkParams = [employeeId];
    
    if (whereClause) {
      checkQuery += ` AND ${whereClause}`;
      checkParams.push(...params);
    }
    
    const [checkRows] = await db.query(checkQuery, checkParams);
    if (checkRows.length === 0) {
      return res.status(404).json({ message: 'Employee not found or access denied' });
    }
    
    // Get advance salary records with status (simulated based on creation date)
    const [rows] = await db.query(`
      SELECT 
        a.id,
        a.employee_id,
        a.amount,
        a.month_year,
        'Manual advance salary entry' as reason,
        a.uploaded_date as created_date,
        CASE 
          WHEN DATE(a.uploaded_date) >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN 'active'
          ELSE 'deducted'
        END as status
      FROM advance_salary a 
      WHERE a.employee_id = ?
      ORDER BY a.month_year DESC, a.uploaded_date DESC
    `, [employeeId]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get advance salary overview for management dashboard
exports.getOverview = async (req, res) => {
  try {
    const { buildOfficeFilter } = require('../middleware/auth');
    const { whereClause, params } = buildOfficeFilter(req, 'e');
    
    // Get overview statistics
    let overviewQuery = `
      SELECT 
        COUNT(DISTINCT a.employee_id) as total_employees_with_advances,
        COUNT(a.id) as total_advance_records,
        COUNT(CASE WHEN DATE_FORMAT(STR_TO_DATE(CONCAT(a.month_year, '-01'), '%Y-%m-%d'), '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN 1 END) as current_month_advances,
        COALESCE(SUM(a.amount), 0) as total_advance_amount,
        COALESCE(AVG(a.amount), 0) as average_advance_amount
      FROM advance_salary a
      INNER JOIN employees e ON a.employee_id = e.employeeId
    `;
    
    let overviewParams = [];
    if (whereClause) {
      overviewQuery += ` WHERE ${whereClause}`;
      overviewParams = params;
    }
    
    const [overviewRows] = await db.query(overviewQuery, overviewParams);
    
      // Get employee list with advance summary
      let employeeQuery = `
        SELECT 
          e.employeeId as employee_id,
          e.name as employee_name,
          o.name as office_name,
          e.monthlySalary as monthly_salary,
          COUNT(a.id) as total_advances,
          COALESCE(SUM(CASE WHEN DATE_FORMAT(STR_TO_DATE(CONCAT(a.month_year, '-01'), '%Y-%m-%d'), '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN a.amount ELSE 0 END), 0) as current_month_advance,
          MAX(a.uploaded_date) as last_advance_date,
          MAX(a.month_year) as last_advance_month,
          COALESCE(SUM(a.amount), 0) as total_amount,
          CASE 
            WHEN COUNT(a.id) = 0 THEN 'no_advances'
            WHEN COUNT(CASE WHEN DATE_FORMAT(STR_TO_DATE(CONCAT(a.month_year, '-01'), '%Y-%m-%d'), '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN 1 END) > 0 THEN 'active'
            ELSE 'pending'
          END as status
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN advance_salary a ON e.employeeId = a.employee_id
    `;
    
    let employeeParams = [];
    if (whereClause) {
      employeeQuery += ` WHERE ${whereClause}`;
      employeeParams = params;
    }
    
    employeeQuery += ` GROUP BY e.employeeId, e.name, o.name, e.monthlySalary ORDER BY e.name ASC`;
    
    const [employeeRows] = await db.query(employeeQuery, employeeParams);
    
    const overview = {
      total_employees_with_advances: overviewRows[0].total_employees_with_advances,
      total_advance_records: overviewRows[0].total_advance_records,
      current_month_advances: overviewRows[0].current_month_advances,
      total_amount: overviewRows[0].total_advance_amount.toString(),
      average_advance_amount: overviewRows[0].average_advance_amount,
      employees: employeeRows
    };
    
    res.json(overview);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
