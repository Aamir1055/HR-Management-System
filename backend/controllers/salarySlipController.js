console.log("==> salarySlipController.js loaded - with PDF colors");

const moment = require('moment');
const PDFDocument = require('pdfkit');

// Utility function for consistent date formatting
const formatDateForDB = (date) => {
  if (!date) return null;
  return moment(date).format('YYYY-MM-DD');
};

// Calculate working days in a month using holidays API
const getWorkingDaysInMonth = async (year, month) => {
  try {
    const response = await fetch(`http://localhost:5000/api/holidays/working-days?year=${year}&month=${month}`);
    
    if (!response.ok) {
      console.warn(`Holidays API returned status ${response.status}, using fallback calculation`);
      return getWorkingDaysInMonthFallback(year, month);
    }
    
    const data = await response.json();
    
    if (data.workingDays !== undefined && data.year == year && data.month == month) {
      console.log(`Working days from API for ${month}/${year}: ${data.workingDays}`);
      return data.workingDays;
    } else {
      console.warn(`Invalid API response format, using fallback calculation. Response:`, data);
      // Fallback to local calculation
      return getWorkingDaysInMonthFallback(year, month);
    }
  } catch (error) {
    console.error(`Error fetching working days from API:`, error);
    // Fallback to local calculation
    return getWorkingDaysInMonthFallback(year, month);
  }
};

// Fallback calculation for working days
const getWorkingDaysInMonthFallback = (year, month) => {
  const startDate = moment({ year, month: month - 1, day: 1 });
  const endDate = moment(startDate).endOf('month');
  let workingDays = 0;
  
  const current = moment(startDate);
  while (current.isSameOrBefore(endDate)) {
    // UAE weekend is Friday (5) and Saturday (6)
    if (current.day() !== 5 && current.day() !== 6) {
      workingDays++;
    }
    current.add(1, 'day');
  }
  
  console.log(`Working days from fallback calculation for ${month}/${year}: ${workingDays}`);
  return workingDays;
};

// Generate salary slip data for a specific employee and month
const generateSalarySlipData = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    
    console.log(`Generating salary slip for ${employeeId} - ${month}/${year}`);
    
    // Validate inputs
    if (!employeeId || !month || !year) {
      return res.status(400).json({ error: 'Employee ID, month, and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (monthNum < 1 || monthNum > 12 || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    // Get employee details with position name
    const [employeeRows] = await req.db.query(`
      SELECT e.*, p.title as position_name, o.name as office_name
      FROM employees e
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE e.employeeId = ?
    `, [employeeId]);

    if (employeeRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeRows[0];

    // Get payroll data for the specified month/year
    console.log(`=== FETCHING FRESH PAYROLL DATA ===`);
    console.log(`Query: SELECT * FROM payroll WHERE employeeId = '${employeeId}' AND month = ${monthNum} AND year = ${yearNum}`);
    
    const [payrollRows] = await req.db.query(`
      SELECT * FROM payroll 
      WHERE employeeId = ? AND month = ? AND year = ?
    `, [employeeId, monthNum, yearNum]);

    console.log(`Payroll rows found: ${payrollRows.length}`);
    if (payrollRows.length > 0) {
      console.log(`Fresh payroll data:`, JSON.stringify(payrollRows[0], null, 2));
    }

    if (payrollRows.length === 0) {
      return res.status(404).json({ error: 'Payroll data not found for the specified month' });
    }

    const payroll = payrollRows[0];

    // Get advance salary for the month
    const monthYearStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    const [advanceSalaryRows] = await req.db.query(`
      SELECT COALESCE(SUM(amount), 0) as advance_amount
      FROM advance_salary 
      WHERE employee_id = ? AND month_year = ?
    `, [employeeId, monthYearStr]);

    const advanceAmount = parseFloat(advanceSalaryRows[0]?.advance_amount || 0);

    // Calculate working days in the month
    const totalWorkingDays = await getWorkingDaysInMonth(yearNum, monthNum);
    
    // FIXED: Get attendance metrics from payroll table with proper field mapping
    const presentDays = payroll.present_days || 0;
    const halfDays = payroll.half_days || 0;
    const approvedLeaves = payroll.approved_leaves || 0; // Now stored separately
    const actualAbsentDays = payroll.leaves || 0; // This is now only actual absent days (invalid punch)
    const excessLeaves = payroll.excess_leaves || 0;
    const lateDays = payroll.late_days || 0;
    
    // Debug logging for salary slip calculation
    console.log(`\n=== SALARY SLIP DATA DEBUG for Employee ${employeeId} ===`);
    console.log(`Present Days: ${presentDays}`);
    console.log(`Half Days: ${halfDays}`);
    console.log(`Approved Leaves: ${approvedLeaves}`);
    console.log(`Actual Absent Days (leaves field): ${actualAbsentDays}`);
    console.log(`Excess Leaves: ${excessLeaves}`);
    console.log(`Late Days: ${lateDays}`);
    console.log(`Total Working Days: ${totalWorkingDays}`);
    
    // Calculate total absent days for display (half days count as 0.5)
    const totalAbsentDays = actualAbsentDays + (halfDays * 0.5) + approvedLeaves;
    console.log(`Calculated Total Absent Days: ${actualAbsentDays} + (${halfDays} * 0.5) + ${approvedLeaves} = ${totalAbsentDays}`);
    console.log(`=== END DEBUG ===\n`);
    
    // Calculate deductions
    const grossSalary = parseFloat(employee.monthlySalary);
    const perDayRate = grossSalary / totalWorkingDays;
    
    // FIXED: Calculate deductions properly
    // 1. Actual absent days deduction
    const absentDeduction = actualAbsentDays * perDayRate;
    
    // 2. Half days deduction (half rate)
    const halfDayDeduction = halfDays * 0.5 * perDayRate;
    
    // 3. Approved leaves deduction (full rate)
    const approvedLeaveDeduction = approvedLeaves * perDayRate;
    
    // 4. Excess leaves deduction (2x penalty)
    const excessLeaveDeduction = excessLeaves * 2 * perDayRate;
    
    // Total attendance-based deductions
    const attendanceDeduction = absentDeduction + halfDayDeduction + approvedLeaveDeduction + excessLeaveDeduction;
    
    // Total deductions
    const totalDeductions = attendanceDeduction + advanceAmount;
    
    // Net salary
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    // Prepare salary slip data in the format expected by frontend
    const salarySlipData = {
      employee: {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email || '',
        phone: employee.phone || '',
        address: employee.address || '',
        office_name: employee.office_name || 'N/A',
        position_title: employee.position_name || 'N/A',
        joiningDate: employee.joiningDate
      },
      period: {
        month: monthNum,
        year: yearNum,
        monthName: moment().month(monthNum - 1).format('MMMM'),
        fromDate: moment({ year: yearNum, month: monthNum - 1, day: 1 }).format('YYYY-MM-DD'),
        toDate: moment({ year: yearNum, month: monthNum - 1 }).endOf('month').format('YYYY-MM-DD')
      },
      attendance: {
        workingDays: totalWorkingDays,
        presentDays,
        absentDays: actualAbsentDays + (halfDays * 0.5) + approvedLeaves, // CORRECT: leaves + approved_leaves + (half_days * 0.5) (NOT excess_leaves)
        pureAbsentDays: actualAbsentDays, // Pure absent days for reference
        halfDays,
        lateDays,
        excessLeaves, // This should be separate and NOT included in absentDays
        approvedLeaves,
        missingDays: Math.max(0, totalWorkingDays - presentDays - actualAbsentDays - halfDays - approvedLeaves)
      },
      salary: {
        baseSalary: parseFloat(grossSalary.toFixed(2)),
        perDaySalary: parseFloat(perDayRate.toFixed(2)),
        grossSalary: parseFloat(grossSalary.toFixed(2)),
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        netSalary: parseFloat(netSalary.toFixed(2)),
        advanceSalary: parseFloat(advanceAmount.toFixed(2))
      },
      deductions: {
        absentDeduction: parseFloat(absentDeduction.toFixed(2)),
        approvedLeaveDeduction: parseFloat(approvedLeaveDeduction.toFixed(2)),
        halfDayDeduction: parseFloat(halfDayDeduction.toFixed(2)),
        excessLeaveDeduction: parseFloat(excessLeaveDeduction.toFixed(2)),
        missingDayDeduction: 0,
        advanceDeduction: parseFloat(advanceAmount.toFixed(2))
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'System',
        workingDaysSource: 'calculated',
        timezone: 'UTC+4'
      }
    };

    // Add cache-busting headers to ensure fresh data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      success: true,
      data: salarySlipData,
      timestamp: new Date().toISOString() // Add timestamp to track freshness
    });

  } catch (error) {
    console.error('Error generating salary slip data:', error);
    res.status(500).json({ error: 'Failed to generate salary slip data' });
  }
};

// Generate PDF salary slip
const generateSalarySlipPDF = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    
    console.log(`Generating PDF salary slip for ${employeeId} - ${month}/${year}`);
    
    // First get the salary slip data
    const tempReq = { ...req, params: { employeeId, month, year } };
    const tempRes = {
      json: (data) => data,
      status: () => ({ json: (data) => data })
    };

    // Get salary slip data (reuse the logic from generateSalarySlipData)
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Get employee details
    const [employeeRows] = await req.db.query(`
      SELECT e.*, p.title as position_name, o.name as office_name
      FROM employees e
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE e.employeeId = ?
    `, [employeeId]);

    if (employeeRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeRows[0];

    // Get payroll data for PDF
    console.log(`=== FETCHING FRESH PAYROLL DATA FOR PDF ===`);
    console.log(`Query: SELECT * FROM payroll WHERE employeeId = '${employeeId}' AND month = ${monthNum} AND year = ${yearNum}`);
    
    const [payrollRows] = await req.db.query(`
      SELECT * FROM payroll 
      WHERE employeeId = ? AND month = ? AND year = ?
    `, [employeeId, monthNum, yearNum]);

    console.log(`PDF Payroll rows found: ${payrollRows.length}`);
    if (payrollRows.length > 0) {
      console.log(`Fresh PDF payroll data:`, JSON.stringify(payrollRows[0], null, 2));
    }

    if (payrollRows.length === 0) {
      return res.status(404).json({ error: 'Payroll data not found for the specified month' });
    }

    const payroll = payrollRows[0];

    // Get advance salary
    const monthYearStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    const [advanceSalaryRows] = await req.db.query(`
      SELECT COALESCE(SUM(amount), 0) as advance_amount
      FROM advance_salary 
      WHERE employee_id = ? AND month_year = ?
    `, [employeeId, monthYearStr]);

    const advanceAmount = parseFloat(advanceSalaryRows[0]?.advance_amount || 0);

    // Calculate data same as above
    // Calculate working days and get attendance data from payroll table (FIXED for PDF)
    const totalWorkingDays = await getWorkingDaysInMonth(yearNum, monthNum);
    const presentDays = payroll.present_days || 0;
    const halfDays = payroll.half_days || 0;
    const approvedLeaves = payroll.approved_leaves || 0; // Now stored separately
    const excessLeaves = payroll.excess_leaves || 0;
    const lateDays = payroll.late_days || 0;
    const actualAbsentDays = payroll.leaves || 0; // This is now only actual absent days (invalid punch)
    
    const grossSalary = parseFloat(employee.monthlySalary);
    const perDayRate = grossSalary / totalWorkingDays;
    
    // FIXED: Calculate deductions separately (same logic as salary slip data)
    // 1. Actual absent days deduction
    const absentDeduction = actualAbsentDays * perDayRate;
    
    // 2. Half days deduction (half rate)
    const halfDayDeduction = halfDays * 0.5 * perDayRate;
    
    // 3. Approved leaves deduction (full rate)
    const approvedLeaveDeduction = approvedLeaves * perDayRate;
    
    // 4. Excess leaves deduction (2x penalty)
    const excessLeaveDeduction = excessLeaves * 2 * perDayRate;
    
    // Combined absent/half/approved deduction for PDF display
    const absentHalfApprovedDeduction = absentDeduction + halfDayDeduction + approvedLeaveDeduction;
    
    const totalDeductions = absentHalfApprovedDeduction + excessLeaveDeduction + advanceAmount;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    // Debug logging for PDF generation - especially for EMP-018
    console.log(`=== PDF Generation Debug for Employee ${employeeId} ===`);
    console.log(`Working Days: ${totalWorkingDays}`);
    console.log(`Present Days: ${presentDays}`);
    console.log(`Half Days: ${halfDays}`);
    console.log(`Approved Leaves: ${approvedLeaves}`);
    console.log(`Excess Leaves: ${excessLeaves}`);
    console.log(`Actual Absent Days: ${actualAbsentDays}`);
    console.log(`Gross Salary: ${grossSalary}`);
    console.log(`Per Day Rate: ${perDayRate}`);
    console.log(`Absent Deduction: ${absentDeduction}`);
    console.log(`Half Day Deduction: ${halfDayDeduction}`);
    console.log(`Approved Leave Deduction: ${approvedLeaveDeduction}`);
    console.log(`Absent+Half+Approved Deduction: ${absentHalfApprovedDeduction}`);
    console.log(`Excess Leave Deduction (${excessLeaves} * 2 * ${perDayRate}): ${excessLeaveDeduction}`);
    console.log(`Advance Amount: ${advanceAmount}`);
    console.log(`Total Deductions: ${totalDeductions}`);
    console.log(`Net Salary: ${netSalary}`);
    console.log(`=== End Debug ===`);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers for PDF download
    const filename = `salary_slip_${employeeId}_${monthNum}_${yearNum}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe the PDF to response
    doc.pipe(res);

    // Add content to PDF
    const monthName = moment().month(monthNum - 1).format('MMMM');
    
    // Header
    doc.fontSize(20).text('SALARY SLIP', { align: 'center' });
    doc.fontSize(14).text(`${monthName} ${yearNum}`, { align: 'center' });
    doc.moveDown(2);

    // Employee Information
    doc.fontSize(16).text('Employee Information:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Emp Id: ${employee.employeeId}`);
    doc.text(`Name: ${employee.name}`);
    doc.text(`Position: ${employee.position_name || 'N/A'}`);
    doc.text(`Office: ${employee.office_name || 'N/A'}`);
    doc.moveDown(2);

    // Calculate total absent days for display (FIXED)
    const totalAbsentDaysForDisplay = actualAbsentDays + halfDays + approvedLeaves;
    
    // Attendance Summary
    console.log('=== Adding Attendance Summary to PDF ===');
    doc.fontSize(16).text('Attendance Summary:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Working Days: ${totalWorkingDays}`);
    doc.text(`Present Days: ${presentDays}`);
    doc.text(`Absent Days: ${totalAbsentDaysForDisplay} (${actualAbsentDays} absent + ${halfDays} half days + ${approvedLeaves} approved leaves)`);
    doc.text(`Half Days: ${halfDays}`);
    doc.text(`Late Punch In: ${lateDays}`);
    doc.text(`Approved Leaves: ${approvedLeaves}`);
    
    const excessLeavesText = `Excess Leaves: ${excessLeaves} (Deduction: AED ${excessLeaveDeduction.toFixed(2)})`;
    console.log('Adding to PDF:', excessLeavesText);
    doc.text(excessLeavesText);
    
    doc.moveDown(2);
    console.log('=== Attendance Summary Added ===');

    // Salary Breakdown
    doc.fontSize(16).text('Salary Breakdown:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    
    // Create a simple table-like structure
    const leftCol = 350;
    const rightCol = 450;
    
    // Gross Salary in Green
    doc.fillColor('#008000'); // Green color
    doc.text('Gross Salary:', 50);
    doc.text(`AED ${grossSalary.toFixed(2)}`, rightCol, doc.y - 14);
    
    // Reset to black for deductions header
    doc.fillColor('#000000');
    doc.text('Deductions:', 50);
    doc.text('', rightCol);
    
    // Absent/Half Days deduction in Red
    doc.fillColor('#FF0000'); // Red color
    doc.text('  Absent/Half Days:', 70);
    doc.text(`AED ${absentHalfApprovedDeduction.toFixed(2)}`, rightCol, doc.y - 14);
    
    // Excess Leaves deduction in Red with count
    doc.text(`  Excess Leaves (${excessLeaves}):`, 70);
    doc.text(`AED ${excessLeaveDeduction.toFixed(2)}`, rightCol, doc.y - 14);
    
    // Advance Salary deduction in Red
    doc.text('  Advance Salary:', 70);
    doc.text(`AED ${advanceAmount.toFixed(2)}`, rightCol, doc.y - 14);
    
    // Reset to black for total deductions
    doc.fillColor('#000000');
    
    // Draw a line
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);
    
    doc.text('Total Deductions:', 50);
    doc.text(`AED ${totalDeductions.toFixed(2)}`, rightCol, doc.y - 14);
    
    doc.moveDown(0.5);
    
    // Net Salary in Blue
    doc.fillColor('#0000FF'); // Blue color
    doc.fontSize(14).text('Net Salary:', 50, undefined, { continued: true });
    doc.text(`AED ${netSalary.toFixed(2)}`, rightCol, doc.y, { width: 100 });

    // Finalize PDF (removed footer as requested)
    doc.end();

  } catch (error) {
    console.error('Error generating salary slip PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate salary slip PDF' });
    }
  }
};

// Get list of employees with available salary slips
const getEmployeesWithSalarySlips = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let query = `
      SELECT DISTINCT 
        e.employeeId, 
        e.name, 
        e.position_id,
        p.title as position_name,
        o.name as office_name,
        pr.month,
        pr.year
      FROM employees e
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN offices o ON e.office_id = o.id
      INNER JOIN payroll pr ON e.employeeId = pr.employeeId
      WHERE e.status = 1
    `;
    
    const params = [];
    
    if (month && year) {
      query += ` AND pr.month = ? AND pr.year = ?`;
      params.push(parseInt(month), parseInt(year));
    }
    
    query += ` ORDER BY e.name`;
    
    const [rows] = await req.db.query(query, params);
    
    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error fetching employees with salary slips:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// Get available months/years for salary slips
const getAvailablePeriods = async (req, res) => {
  try {
    const [rows] = await req.db.query(`
      SELECT DISTINCT month, year 
      FROM payroll 
      ORDER BY year DESC, month DESC
    `);
    
    const periods = rows.map(row => ({
      month: row.month,
      year: row.year,
      monthName: moment().month(row.month - 1).format('MMMM'),
      display: `${moment().month(row.month - 1).format('MMMM')} ${row.year}`
    }));
    
    res.json({
      success: true,
      data: periods
    });

  } catch (error) {
    console.error('Error fetching available periods:', error);
    res.status(500).json({ error: 'Failed to fetch available periods' });
  }
};

// Generate simplified salary slips for all employees
const generateAllSimplifiedSalarySlips = async (req, res) => {
  try {
    const { month, year, search, office, position, employeeIds } = req.query;
    
    console.log(`=== GENERATING SALARY SLIPS FOR ${month}/${year} ===`);
    console.log('RAW req.query object:', JSON.stringify(req.query, null, 2));
    console.log('Filter parameters received:', { 
      search: search || 'NONE', 
      office: office || 'NONE', 
      position: position || 'NONE', 
      employeeIds: employeeIds || 'NONE',
      employeeIdsLength: employeeIds ? employeeIds.split(',').length : 0,
      employeeIdsArray: employeeIds ? employeeIds.split(',').map(id => id.trim()) : []
    });
    
    // Validate inputs
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (monthNum < 1 || monthNum > 12 || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    // Debug: First check what payroll data exists
    const [payrollCheck] = await req.db.query(`
      SELECT COUNT(*) as payroll_count, 
             GROUP_CONCAT(DISTINCT employeeId LIMIT 10) as sample_employees
      FROM payroll 
      WHERE month = ? AND year = ?
    `, [monthNum, yearNum]);
    
    console.log('Payroll check:', payrollCheck[0]);
    
    // Debug: Check employees table
    const [employeeCheck] = await req.db.query(`
      SELECT COUNT(*) as total_employees, 
             COUNT(CASE WHEN status = 1 THEN 1 END) as active_employees
      FROM employees
    `);
    
    console.log('Employee check:', employeeCheck[0]);

    // Build query with filters
    let query = `
      SELECT DISTINCT 
        pr.employeeId,
        COALESCE(e.name, CONCAT('Employee ', pr.employeeId)) as name, 
        COALESCE(e.monthlySalary, 3000) as monthlySalary,
        COALESCE(p.title, 'Staff') as position_title,
        COALESCE(o.name, 'Main Office') as office_name,
        COALESCE(e.status, 1) as status
      FROM payroll pr
      LEFT JOIN employees e ON pr.employeeId = e.employeeId
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE pr.month = ? AND pr.year = ?
    `;
    
    const queryParams = [monthNum, yearNum];
    
    // Apply filters if provided
    if (employeeIds) {
      // If specific employee IDs are provided, use them
      const idsArray = employeeIds.split(',').map(id => id.trim()).filter(Boolean);
      if (idsArray.length > 0) {
        const placeholders = idsArray.map(() => '?').join(',');
        query += ` AND pr.employeeId IN (${placeholders})`;
        queryParams.push(...idsArray);
        console.log(`Filtering by employee IDs: ${idsArray.join(', ')}`);
      }
    } else {
      // Apply individual filters if no specific employee IDs are provided
      if (search) {
        query += ` AND (
          e.name LIKE ? OR 
          pr.employeeId LIKE ? OR 
          e.email LIKE ? OR 
          e.phone LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        console.log(`Filtering by search term: ${search}`);
      }
      
      if (office) {
        query += ` AND o.name = ?`;
        queryParams.push(office);
        console.log(`Filtering by office: ${office}`);
      }
      
      if (position) {
        query += ` AND p.title = ?`;
        queryParams.push(position);
        console.log(`Filtering by position: ${position}`);
      }
    }
    
    query += ` ORDER BY pr.employeeId`;
    
    console.log('Final query:', query);
    console.log('Query parameters:', queryParams);
    
    const [employeeRows] = await req.db.query(query, queryParams);
    
    console.log(`Found ${employeeRows.length} employees with payroll data:`);
    if (employeeRows.length > 0) {
      console.log('Sample employees:', employeeRows.slice(0, 5).map(emp => `${emp.employeeId}: ${emp.name} (salary: ${emp.monthlySalary})`));
    }

    if (employeeRows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No employees found with payroll data for the specified period'
      });
    }

    const salarySlips = [];
    const totalWorkingDays = await getWorkingDaysInMonth(yearNum, monthNum);

    // Process each employee
    for (const employee of employeeRows) {
      try {
        // Get payroll data for this employee
        const [payrollRows] = await req.db.query(`
          SELECT * FROM payroll 
          WHERE employeeId = ? AND month = ? AND year = ?
        `, [employee.employeeId, monthNum, yearNum]);

        if (payrollRows.length === 0) continue;
        const payroll = payrollRows[0];

        // Get advance salary for the month
        const monthYearStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
        const [advanceSalaryRows] = await req.db.query(`
          SELECT COALESCE(SUM(amount), 0) as advance_amount
          FROM advance_salary 
          WHERE employee_id = ? AND month_year = ?
        `, [employee.employeeId, monthYearStr]);

        const advanceAmount = parseFloat(advanceSalaryRows[0]?.advance_amount || 0);

        // FIXED: Calculate attendance metrics using the same logic as main controller
        const presentDays = payroll.present_days || 0;
        const halfDays = payroll.half_days || 0;
        const approvedLeaves = payroll.approved_leaves || 0; // Now stored separately
        const actualAbsentDays = payroll.leaves || 0; // This is now only actual absent days (invalid punch)
        const excessLeaves = payroll.excess_leaves || 0;
        const lateDays = payroll.late_days || 0;
        
        // FIXED: Calculate deductions properly (same as main controller)
        const grossSalary = parseFloat(employee.monthlySalary);
        const perDayRate = grossSalary / totalWorkingDays;
        
        // 1. Actual absent days deduction
        const absentDeduction = actualAbsentDays * perDayRate;
        
        // 2. Half days deduction (half rate)
        const halfDayDeduction = halfDays * 0.5 * perDayRate;
        
        // 3. Approved leaves deduction (full rate)
        const approvedLeaveDeduction = approvedLeaves * perDayRate;
        
        // 4. Excess leaves deduction (2x penalty)
        const excessLeaveDeduction = excessLeaves * 2 * perDayRate;
        
        // Combined absent/half/approved deduction for table display
        const totalAbsentRelatedDeduction = absentDeduction + halfDayDeduction + approvedLeaveDeduction;
        
        // Total deductions
        const totalDeduction = totalAbsentRelatedDeduction + excessLeaveDeduction + advanceAmount;
        
        // Net salary
        const netSalary = Math.max(0, grossSalary - totalDeduction);

        // Add to results
        salarySlips.push({
          employeeId: employee.employeeId,
          name: employee.name,
          position: employee.position_title || 'N/A',
          workingDays: totalWorkingDays,
          absentDays: parseFloat((actualAbsentDays + (halfDays * 0.5) + approvedLeaves).toFixed(1)), // FIXED: half days count as 0.5
          latePunchIn: lateDays,
          excessLeaves: excessLeaves,
          grossSalary: parseFloat(grossSalary.toFixed(2)),
          absentDeduction: parseFloat(totalAbsentRelatedDeduction.toFixed(2)), // FIXED: use combined absent/half/approved deduction
          excessLeaveDeduction: parseFloat(excessLeaveDeduction.toFixed(2)),
          advanceSalary: parseFloat(advanceAmount.toFixed(2)),
          totalDeduction: parseFloat(totalDeduction.toFixed(2)),
          netSalary: parseFloat(netSalary.toFixed(2))
        });

      } catch (employeeError) {
        console.error(`Error processing employee ${employee.employeeId}:`, employeeError);
        // Continue with other employees
      }
    }

    res.json({
      success: true,
      data: salarySlips,
      meta: {
        totalEmployees: salarySlips.length,
        period: {
          month: monthNum,
          year: yearNum,
          monthName: moment().month(monthNum - 1).format('MMMM')
        }
      }
    });

  } catch (error) {
    console.error('Error generating all simplified salary slips:', error);
    res.status(500).json({ 
      error: 'Failed to generate salary slips',
      message: error.message
    });
  }
};

module.exports = {
  generateSalarySlipData,
  generateSalarySlipPDF,
  getEmployeesWithSalarySlips,
  getAvailablePeriods,
  generateAllSimplifiedSalarySlips
};
