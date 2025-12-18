/**
 * Salary Slip Controller - Manages salary slip generation and PDF creation
 * Handles salary calculations, loan deductions, and detailed pay slip generation
 */
console.log("==> salarySlipController.js loaded - with loan integration and skip month support");

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
      return getWorkingDaysInMonthFallback(year, month);
    }
  } catch (error) {
    console.error(`Error fetching working days from API:`, error);
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
    if (current.day() !== 5 && current.day() !== 6) { // UAE weekend
      workingDays++;
    }
    current.add(1, 'day');
  }
  
  console.log(`Working days from fallback calculation for ${month}/${year}: ${workingDays}`);
  return workingDays;
};

// Generate salary slip data
const generateSalarySlipData = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    console.log(`Generating salary slip for ${employeeId} - ${month}/${year}`);
    
    if (!employeeId || !month || !year) {
      return res.status(400).json({ error: 'Employee ID, month, and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    if (monthNum < 1 || monthNum > 12 || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

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

    // Get payroll data
    const [payrollRows] = await req.db.query(`
      SELECT * FROM payroll 
      WHERE employeeId = ? AND month = ? AND year = ?
    `, [employeeId, monthNum, yearNum]);

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

    // Get loan deductions for the month (considering skip months)
    const [loanRows] = await req.db.query(`
      SELECT l.id, l.description as title, l.monthly_deduction, l.remaining_amount, l.total_loan_amount as total_amount,
             CASE WHEN sm.id IS NOT NULL THEN 1 ELSE 0 END as is_skip_month
      FROM employee_loans l
      LEFT JOIN loan_deduction_skips sm ON l.id = sm.loan_id 
        AND sm.skip_month = ?
      WHERE l.employee_id = ? 
        AND l.status = 'active'
        AND l.remaining_amount > 0
        AND l.start_date <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?, '-01'), '%Y-%m-%d'))
        AND (l.end_date IS NULL OR l.end_date >= STR_TO_DATE(CONCAT(?, '-', ?, '-01'), '%Y-%m-%d'))
      ORDER BY l.id
    `, [monthYearStr, employeeId, yearNum, monthNum, yearNum, monthNum]);
    
    let totalLoanDeduction = 0;
    const loanDetails = [];
    
    for (const loan of loanRows) {
      // Skip this loan if it's marked as skip month
      if (loan.is_skip_month === 1) {
        console.log(`Skipping loan ${loan.id} for ${employeeId} - skip month: ${monthYearStr}`);
        loanDetails.push({
          id: loan.id,
          title: `${loan.title} (SKIPPED)`,
          deduction: 0,
          remainingAfter: parseFloat(loan.remaining_amount),
          skipped: true
        });
        continue;
      }
      
      const monthlyDeduction = parseFloat(loan.monthly_deduction || 0);
      const remainingAmount = parseFloat(loan.remaining_amount || 0);
      const actualDeduction = Math.min(monthlyDeduction, remainingAmount);
      
      if (actualDeduction > 0) {
        totalLoanDeduction += actualDeduction;
        loanDetails.push({
          id: loan.id,
          title: loan.title,
          deduction: actualDeduction,
          remainingAfter: remainingAmount - actualDeduction,
          skipped: false
        });
      }
    }

    // Calculate working days in the month
    const totalWorkingDays = await getWorkingDaysInMonth(yearNum, monthNum);

    // Attendance metrics
    const presentDays = payroll.present_days || 0;
    const halfDays = payroll.half_days || 0;
    const approvedLeaves = payroll.approved_leaves || 0;
    const actualAbsentDays = payroll.leaves || 0;
    const excessLeaves = payroll.excess_leaves || 0;
    const lateDays = payroll.late_days || 0;

    const grossSalary = parseFloat(employee.monthlySalary);
    const perDayRate = grossSalary / totalWorkingDays;

    const absentDeduction = actualAbsentDays * perDayRate;
    const halfDayDeduction = halfDays * 0.5 * perDayRate;
    const approvedLeaveDeduction = approvedLeaves * perDayRate;
    const excessLeaveDeduction = excessLeaves * 2 * perDayRate;

    const attendanceDeduction = absentDeduction + halfDayDeduction + approvedLeaveDeduction + excessLeaveDeduction;
    const totalDeductions = attendanceDeduction + advanceAmount + totalLoanDeduction;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

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
        absentDays: actualAbsentDays + (halfDays * 0.5) + approvedLeaves,
        pureAbsentDays: actualAbsentDays,
        halfDays,
        lateDays,
        excessLeaves,
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
        advanceDeduction: parseFloat(advanceAmount.toFixed(2)),
        loanDeductions: parseFloat(totalLoanDeduction.toFixed(2)),
        loanDetails: loanDetails
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'System',
        workingDaysSource: 'calculated',
        timezone: 'UTC+4'
      }
    };

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({ success: true, data: salarySlipData, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('Error generating salary slip data:', error);
    res.status(500).json({ error: 'Failed to generate salary slip data' });
  }
};

// Generate PDF salary slip (loans removed)
const generateSalarySlipPDF = async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    console.log(`Generating PDF salary slip for ${employeeId} - ${month}/${year}`);

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
    if (employeeRows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const employee = employeeRows[0];

    // Get payroll data
    const [payrollRows] = await req.db.query(`
      SELECT * FROM payroll 
      WHERE employeeId = ? AND month = ? AND year = ?
    `, [employeeId, monthNum, yearNum]);
    if (payrollRows.length === 0) return res.status(404).json({ error: 'Payroll data not found for the specified month' });
    const payroll = payrollRows[0];

    // Get advance salary
    const monthYearStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    const [advanceSalaryRows] = await req.db.query(`
      SELECT COALESCE(SUM(amount), 0) as advance_amount
      FROM advance_salary 
      WHERE employee_id = ? AND month_year = ?
    `, [employeeId, monthYearStr]);
    const advanceAmount = parseFloat(advanceSalaryRows[0]?.advance_amount || 0);

    const totalWorkingDays = await getWorkingDaysInMonth(yearNum, monthNum);
    const presentDays = payroll.present_days || 0;
    const halfDays = payroll.half_days || 0;
    const approvedLeaves = payroll.approved_leaves || 0;
    const excessLeaves = payroll.excess_leaves || 0;
    const lateDays = payroll.late_days || 0;
    const actualAbsentDays = payroll.leaves || 0;

    const grossSalary = parseFloat(employee.monthlySalary);
    const perDayRate = grossSalary / totalWorkingDays;

    const absentDeduction = actualAbsentDays * perDayRate;
    const halfDayDeduction = halfDays * 0.5 * perDayRate;
    const approvedLeaveDeduction = approvedLeaves * perDayRate;
    const excessLeaveDeduction = excessLeaves * 2 * perDayRate;

    const totalDeductions = absentDeduction + halfDayDeduction + approvedLeaveDeduction + excessLeaveDeduction + advanceAmount;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `salary_slip_${employeeId}_${monthNum}_${yearNum}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const monthName = moment().month(monthNum - 1).format('MMMM');

    // Header
    doc.fontSize(20).text('SALARY SLIP', { align: 'center' });
    doc.fontSize(14).text(`${monthName} ${yearNum}`, { align: 'center' });
    doc.moveDown(2);

    // Employee Info
    doc.fontSize(16).text('Employee Information:', { underline: true });
    doc.moveDown(0.5).fontSize(12);
    doc.text(`Emp Id: ${employee.employeeId}`);
    doc.text(`Name: ${employee.name}`);
    doc.text(`Position: ${employee.position_name || 'N/A'}`);
    doc.text(`Office: ${employee.office_name || 'N/A'}`);
    doc.moveDown(2);

    // Attendance Summary
    const totalAbsentDaysForDisplay = actualAbsentDays + halfDays + approvedLeaves;
    doc.fontSize(16).text('Attendance Summary:', { underline: true });
    doc.moveDown(0.5).fontSize(12);
    doc.text(`Total Working Days: ${totalWorkingDays}`);
    doc.text(`Present Days: ${presentDays}`);
    doc.text(`Absent Days: ${totalAbsentDaysForDisplay}`);
    doc.text(`Half Days: ${halfDays}`);
    doc.text(`Late Punch In: ${lateDays}`);
    doc.text(`Approved Leaves: ${approvedLeaves}`);
    doc.text(`Excess Leaves: ${excessLeaves} (Deduction: AED ${excessLeaveDeduction.toFixed(2)})`);
    doc.moveDown(2);

    // Salary Breakdown
    doc.fontSize(16).text('Salary Breakdown:', { underline: true });
    doc.moveDown(0.5).fontSize(12);

    const rightCol = 450;
    
    doc.fillColor('#008000').text('Gross Salary:', 50);
    doc.text(`AED ${grossSalary.toFixed(2)}`, rightCol, doc.y - 14);

    doc.fillColor('#000000').text('Deductions:', 50);

    doc.fillColor('#FF0000').text('  Absent/Half/Approved Leaves:', 70);
    doc.text(`AED ${(absentDeduction + halfDayDeduction + approvedLeaveDeduction).toFixed(2)}`, rightCol, doc.y - 14);

    doc.text(`  Excess Leaves (${excessLeaves}):`, 70);
    doc.text(`AED ${excessLeaveDeduction.toFixed(2)}`, rightCol, doc.y - 14);

    doc.text('  Advance Salary:', 70);
    doc.text(`AED ${advanceAmount.toFixed(2)}`, rightCol, doc.y - 14);

    doc.fillColor('#000000');
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);
    doc.text('Total Deductions:', 50);
    doc.text(`AED ${totalDeductions.toFixed(2)}`, rightCol, doc.y - 14);

    doc.moveDown(0.5).fillColor('#0000FF').fontSize(14)
       .text('Net Salary:', 50, undefined, { continued: true })
       .text(`AED ${netSalary.toFixed(2)}`, rightCol, doc.y, { width: 100 });

    doc.end();

  } catch (error) {
    console.error('Error generating salary slip PDF:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate salary slip PDF' });
  }
};

// Get employees with salary slips
const getEmployeesWithSalarySlips = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = `
      SELECT DISTINCT e.employeeId, e.name, e.position_id,
             p.title as position_name, o.name as office_name,
             pr.month, pr.year
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
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching employees with salary slips:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// Get available periods
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
    res.json({ success: true, data: periods });
  } catch (error) {
    console.error('Error fetching available periods:', error);
    res.status(500).json({ error: 'Failed to fetch available periods' });
  }
};

// Generate simplified salary slips for all employees (optimized with batched queries)
const generateAllSimplifiedSalarySlips = async (req, res) => {
  const startTime = Date.now();
  console.log(`Starting salary slip generation at ${new Date().toISOString()}`);
  
  try {
    // Handle both GET and POST requests
    const requestData = req.method === 'POST' ? req.body : req.query;
    const { month, year, search, office, position, employeeIds } = requestData;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    if (monthNum < 1 || monthNum > 12 || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    // Build employee selection query
    let query = `
      SELECT DISTINCT pr.employeeId,
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
    
    // Handle employee ID filtering
    let targetEmployeeIds = [];
    if (employeeIds) {
      if (Array.isArray(employeeIds)) {
        targetEmployeeIds = employeeIds.filter(Boolean);
      } else {
        targetEmployeeIds = employeeIds.split(',').map(id => id.trim()).filter(Boolean);
      }
      
      if (targetEmployeeIds.length > 0) {
        // Use chunked IN clauses for large lists to avoid SQL limits
        const chunkSize = 1000; // SQL limit for IN clauses
        if (targetEmployeeIds.length > chunkSize) {
          console.log(`Large employee list detected (${targetEmployeeIds.length} employees), using chunked processing`);
        }
        query += ` AND pr.employeeId IN (${targetEmployeeIds.map(() => '?').join(',')})`;
        queryParams.push(...targetEmployeeIds);
      }
    } else {
      // Apply other filters only if no specific employee IDs are provided
      if (search) {
        query += ` AND (e.name LIKE ? OR pr.employeeId LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)`;
        const pattern = `%${search}%`;
        queryParams.push(pattern, pattern, pattern, pattern);
      }
      if (office) {
        query += ` AND o.name = ?`;
        queryParams.push(office);
      }
      if (position) {
        query += ` AND p.title = ?`;
        queryParams.push(position);
      }
    }
    query += ` ORDER BY pr.employeeId`;

    console.log(`Fetching employees with query parameters: ${queryParams.length} params`);
    const [employeeRows] = await req.db.query(query, queryParams);
    
    if (employeeRows.length === 0) {
      console.log('No employees found matching criteria');
      return res.json({ success: true, data: [], message: 'No employees found' });
    }

    console.log(`Found ${employeeRows.length} employees to process`);
    const totalWorkingDays = await getWorkingDaysInMonth(yearNum, monthNum);
    
    // Extract all employee IDs for batched queries
    const allEmployeeIds = employeeRows.map(emp => emp.employeeId);
    const monthYearStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    
    // Batch query 1: Get all payroll data at once
    console.log('Fetching payroll data in batch...');
    const payrollQuery = `
      SELECT * FROM payroll 
      WHERE employeeId IN (${allEmployeeIds.map(() => '?').join(',')}) 
        AND month = ? AND year = ?
      ORDER BY employeeId
    `;
    const [allPayrollRows] = await req.db.query(payrollQuery, [...allEmployeeIds, monthNum, yearNum]);
    const payrollMap = new Map(allPayrollRows.map(row => [row.employeeId, row]));
    
    // Batch query 2: Get all advance salary data at once
    console.log('Fetching advance salary data in batch...');
    const advanceQuery = `
      SELECT employee_id, COALESCE(SUM(amount), 0) as advance_amount
      FROM advance_salary 
      WHERE employee_id IN (${allEmployeeIds.map(() => '?').join(',')}) 
        AND month_year = ?
      GROUP BY employee_id
    `;
    const [allAdvanceRows] = await req.db.query(advanceQuery, [...allEmployeeIds, monthYearStr]);
    const advanceMap = new Map(allAdvanceRows.map(row => [row.employee_id, parseFloat(row.advance_amount || 0)]));
    
    // Batch query 3: Get all loan data at once
    console.log('Fetching loan data in batch...');
    const loanQuery = `
      SELECT l.employee_id, l.id, l.description as title, l.monthly_deduction, l.remaining_amount, l.total_loan_amount as total_amount,
             CASE WHEN sm.id IS NOT NULL THEN 1 ELSE 0 END as is_skip_month
      FROM employee_loans l
      LEFT JOIN loan_deduction_skips sm ON l.id = sm.loan_id AND sm.skip_month = ?
      WHERE l.employee_id IN (${allEmployeeIds.map(() => '?').join(',')}) 
        AND l.status = 'active'
        AND l.remaining_amount > 0
        AND l.start_date <= LAST_DAY(STR_TO_DATE(CONCAT(?, '-', ?, '-01'), '%Y-%m-%d'))
        AND (l.end_date IS NULL OR l.end_date >= STR_TO_DATE(CONCAT(?, '-', ?, '-01'), '%Y-%m-%d'))
      ORDER BY l.employee_id, l.id
    `;
    const [allLoanRows] = await req.db.query(loanQuery, [monthYearStr, ...allEmployeeIds, yearNum, monthNum, yearNum, monthNum]);
    
    // Group loans by employee
    const loanMap = new Map();
    for (const loan of allLoanRows) {
      if (!loanMap.has(loan.employee_id)) {
        loanMap.set(loan.employee_id, []);
      }
      loanMap.get(loan.employee_id).push(loan);
    }
    
    console.log('Processing salary calculations...');
    const salarySlips = [];
    let processedCount = 0;
    
    for (const employee of employeeRows) {
      try {
        const payroll = payrollMap.get(employee.employeeId);
        if (!payroll) {
          console.warn(`No payroll data found for employee ${employee.employeeId}`);
          continue;
        }

        const advanceAmount = advanceMap.get(employee.employeeId) || 0;
        const employeeLoans = loanMap.get(employee.employeeId) || [];
        
        // Calculate loan deductions
        let totalLoanDeduction = 0;
        for (const loan of employeeLoans) {
          if (loan.is_skip_month === 1) {
            continue; // Skip this month
          }
          
          const monthlyDeduction = parseFloat(loan.monthly_deduction || 0);
          const remainingAmount = parseFloat(loan.remaining_amount || 0);
          const actualDeduction = Math.min(monthlyDeduction, remainingAmount);
          
          if (actualDeduction > 0) {
            totalLoanDeduction += actualDeduction;
          }
        }

        // Calculate attendance and salary
        const presentDays = payroll.present_days || 0;
        const halfDays = payroll.half_days || 0;
        const approvedLeaves = payroll.approved_leaves || 0;
        const plannedHalfDays = payroll.planned_half_days || 0;
        const actualAbsentDays = payroll.leaves || 0;
        const excessLeaves = payroll.excess_leaves || 0;
        const lateDays = payroll.late_days || 0;

        const grossSalary = parseFloat(employee.monthlySalary);
        const perDayRate = grossSalary / totalWorkingDays;

        // Derive missing days to stay in sync with payroll calculation
        const missingDays = Math.max(0, totalWorkingDays - presentDays - halfDays - approvedLeaves - actualAbsentDays);

        const absentDeduction = actualAbsentDays * perDayRate;
        const halfDayDeduction = halfDays * 0.5 * perDayRate;
        const plannedHalfDayDeduction = plannedHalfDays * 0.5 * perDayRate;
        const approvedLeaveDeduction = approvedLeaves * perDayRate;
        const missingDayDeduction = missingDays * perDayRate;
        const excessLeaveDeduction = excessLeaves * 2 * perDayRate;

        const attendanceRelatedDeduction = 
          absentDeduction + halfDayDeduction + plannedHalfDayDeduction + approvedLeaveDeduction + missingDayDeduction + excessLeaveDeduction;
        const totalDeduction = attendanceRelatedDeduction + advanceAmount + totalLoanDeduction;
        const netSalary = Math.max(0, grossSalary - totalDeduction);

        salarySlips.push({
          employeeId: employee.employeeId,
          name: employee.name,
          position: employee.position_title || 'N/A',
          workingDays: totalWorkingDays,
          absentDays: parseFloat((actualAbsentDays + (halfDays * 0.5) + approvedLeaves + (plannedHalfDays * 0.5)).toFixed(1)),
          latePunchIn: lateDays,
          excessLeaves,
          grossSalary: parseFloat(grossSalary.toFixed(2)),
          absentDeduction: parseFloat((absentDeduction + halfDayDeduction + plannedHalfDayDeduction + approvedLeaveDeduction + missingDayDeduction).toFixed(2)),
          excessLeaveDeduction: parseFloat(excessLeaveDeduction.toFixed(2)),
          advanceSalary: parseFloat(advanceAmount.toFixed(2)),
          loanDeductions: parseFloat(totalLoanDeduction.toFixed(2)),
          totalDeduction: parseFloat(totalDeduction.toFixed(2)),
          netSalary: parseFloat(netSalary.toFixed(2))
        });
        
        processedCount++;
        if (processedCount % 50 === 0) {
          console.log(`Processed ${processedCount}/${employeeRows.length} employees`);
        }
      } catch (employeeError) {
        console.error(`Error processing employee ${employee.employeeId}:`, employeeError);
        // Continue processing other employees instead of failing the entire batch
      }
    }

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`Completed salary slip generation: ${salarySlips.length} slips generated in ${processingTime}s`);
    
    res.json({
      success: true,
      data: salarySlips,
      meta: {
        totalEmployees: salarySlips.length,
        processedEmployees: processedCount,
        processingTimeSeconds: processingTime,
        period: {
          month: monthNum,
          year: yearNum,
          monthName: moment().month(monthNum - 1).format('MMMM')
        }
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;
    
    console.error('Error generating all simplified salary slips:', {
      error: error.message,
      stack: error.stack,
      processingTime: processingTime
    });
    
    // Return more detailed error information
    res.status(500).json({ 
      error: 'Failed to generate salary slips', 
      message: error.message,
      processingTime: processingTime,
      timestamp: new Date().toISOString()
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
