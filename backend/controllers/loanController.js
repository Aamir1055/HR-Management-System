const { query } = require('../utils/dbPromise');
const moment = require('moment');

// ================ LOAN CONTROLLERS ================

// Get all loans with employee details
exports.getAllLoans = async (req, res) => {
  try {
    const { status, employee_id } = req.query;
    
    let whereConditions = [];
    let params = [];
    
    if (status) {
      whereConditions.push('el.status = ?');
      params.push(status);
    }
    
    if (employee_id) {
      whereConditions.push('el.employee_id = ?');
      params.push(employee_id);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const results = await query(`
      SELECT 
        el.id,
        el.employee_id,
        e.name as employee_name,
        el.title,
        el.total_amount,
        el.monthly_deduction,
        el.description,
        el.start_date,
        el.end_date,
        el.status,
        el.remaining_amount,
        el.created_by,
        el.created_at,
        el.updated_at,
        COALESCE(payment_summary.total_paid, 0) as total_paid,
        COALESCE(payment_summary.payment_count, 0) as payment_count,
        CASE 
          WHEN el.remaining_amount <= 0 THEN 'completed'
          WHEN el.start_date > CURDATE() THEN 'pending'
          ELSE el.status
        END as computed_status
      FROM employee_loans el
      LEFT JOIN employees e ON el.employee_id = e.employeeId
      LEFT JOIN (
        SELECT 
          loan_id,
          COUNT(*) as payment_count,
          SUM(amount_paid) as total_paid
        FROM loan_payments
        GROUP BY loan_id
      ) payment_summary ON el.id = payment_summary.loan_id
      ${whereClause}
      ORDER BY el.created_at DESC
    `, params);
    
    res.json(results);
  } catch (err) {
    console.error('Error fetching loans:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get loan by ID with payment history
exports.getLoanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get loan details
    const loanResult = await query(`
      SELECT 
        el.id,
        el.employee_id,
        e.name as employee_name,
        e.monthlySalary as employee_salary,
        el.title,
        el.total_amount,
        el.monthly_deduction,
        el.description,
        el.start_date,
        el.end_date,
        el.status,
        el.remaining_amount,
        el.created_by,
        el.created_at,
        el.updated_at
      FROM employee_loans el
      LEFT JOIN employees e ON el.employee_id = e.employeeId
      WHERE el.id = ?
    `, [id]);
    
    if (loanResult.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    // Get payment history
    const payments = await query(`
      SELECT 
        id,
        payment_date,
        amount_paid,
        remaining_balance,
        payroll_month,
        created_at
      FROM loan_payments
      WHERE loan_id = ?
      ORDER BY payment_date DESC
    `, [id]);
    
    const loan = loanResult[0];
    loan.payment_history = payments;
    
    res.json(loan);
  } catch (err) {
    console.error('Error fetching loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new loan
exports.createLoan = async (req, res) => {
  try {
    const { 
      employee_id, 
      title, 
      total_amount, 
      monthly_deduction, 
      description, 
      start_date 
    } = req.body;
    
    // Validation
    if (!employee_id || !title || !total_amount || !monthly_deduction || !start_date) {
      return res.status(400).json({ 
        error: 'Employee ID, title, total amount, monthly deduction, and start date are required' 
      });
    }
    
    if (parseFloat(total_amount) <= 0 || parseFloat(monthly_deduction) <= 0) {
      return res.status(400).json({ 
        error: 'Total amount and monthly deduction must be positive numbers' 
      });
    }
    
    if (parseFloat(monthly_deduction) > parseFloat(total_amount)) {
      return res.status(400).json({ 
        error: 'Monthly deduction cannot be greater than total amount' 
      });
    }
    
    // Check if employee exists
    const employeeCheck = await query(
      'SELECT employeeId FROM employees WHERE employeeId = ?',
      [employee_id]
    );
    
    if (employeeCheck.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }
    
    // Calculate end date based on monthly deduction
    const totalMonths = Math.ceil(parseFloat(total_amount) / parseFloat(monthly_deduction));
    const endDate = moment(start_date).add(totalMonths, 'months').format('YYYY-MM-DD');
    
    // Get created_by from token (assuming it's available in req.user)
    const createdBy = req.user ? req.user.username : 'system';
    
    const result = await query(`
      INSERT INTO employee_loans (
        employee_id, 
        title, 
        total_amount, 
        monthly_deduction, 
        description, 
        start_date, 
        end_date, 
        remaining_amount,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employee_id,
      title,
      parseFloat(total_amount),
      parseFloat(monthly_deduction),
      description || null,
      start_date,
      endDate,
      parseFloat(total_amount), // Initially, remaining amount equals total amount
      createdBy
    ]);
    
    res.status(201).json({
      id: result.insertId,
      employee_id,
      title,
      total_amount: parseFloat(total_amount),
      monthly_deduction: parseFloat(monthly_deduction),
      description,
      start_date,
      end_date: endDate,
      remaining_amount: parseFloat(total_amount),
      status: 'active',
      message: 'Loan created successfully'
    });
  } catch (err) {
    console.error('Error creating loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update loan
exports.updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      total_amount, 
      monthly_deduction, 
      description, 
      start_date,
      status 
    } = req.body;
    
    // Check if loan exists
    const existingLoan = await query(
      'SELECT * FROM employee_loans WHERE id = ?',
      [id]
    );
    
    if (existingLoan.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    const loan = existingLoan[0];
    
    // Build update query dynamically
    const updateFields = [];
    const params = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      params.push(title);
    }
    
    if (total_amount !== undefined) {
      if (parseFloat(total_amount) <= 0) {
        return res.status(400).json({ error: 'Total amount must be a positive number' });
      }
      updateFields.push('total_amount = ?');
      params.push(parseFloat(total_amount));
    }
    
    if (monthly_deduction !== undefined) {
      if (parseFloat(monthly_deduction) <= 0) {
        return res.status(400).json({ error: 'Monthly deduction must be a positive number' });
      }
      updateFields.push('monthly_deduction = ?');
      params.push(parseFloat(monthly_deduction));
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    
    if (start_date !== undefined) {
      updateFields.push('start_date = ?');
      params.push(start_date);
    }
    
    if (status !== undefined) {
      if (!['active', 'completed', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be active, completed, or suspended' });
      }
      updateFields.push('status = ?');
      params.push(status);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Recalculate end date if amount or deduction changed
    if (total_amount !== undefined || monthly_deduction !== undefined || start_date !== undefined) {
      const newTotalAmount = total_amount !== undefined ? parseFloat(total_amount) : loan.total_amount;
      const newMonthlyDeduction = monthly_deduction !== undefined ? parseFloat(monthly_deduction) : loan.monthly_deduction;
      const newStartDate = start_date !== undefined ? start_date : loan.start_date;
      
      const totalMonths = Math.ceil(newTotalAmount / newMonthlyDeduction);
      const endDate = moment(newStartDate).add(totalMonths, 'months').format('YYYY-MM-DD');
      
      updateFields.push('end_date = ?');
      params.push(endDate);
    }
    
    params.push(id);
    
    const result = await query(
      `UPDATE employee_loans SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    // Return updated loan
    const updatedLoan = await query(
      'SELECT * FROM employee_loans WHERE id = ?',
      [id]
    );
    
    res.json({
      ...updatedLoan[0],
      message: 'Loan updated successfully'
    });
  } catch (err) {
    console.error('Error updating loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete loan
exports.deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if loan has any payments
    const paymentCheck = await query(
      'SELECT COUNT(*) as count FROM loan_payments WHERE loan_id = ?',
      [id]
    );
    
    if (paymentCheck[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete loan with existing payments. Consider marking it as completed instead.'
      });
    }
    
    const result = await query('DELETE FROM employee_loans WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    res.json({ message: 'Loan deleted successfully' });
  } catch (err) {
    console.error('Error deleting loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get active loans for salary calculation
exports.getActiveLoansForEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { payroll_month } = req.query; // Format: YYYY-MM
    
    if (!payroll_month) {
      return res.status(400).json({ error: 'Payroll month is required (format: YYYY-MM)' });
    }
    
    const results = await query(`
      SELECT 
        el.id,
        el.title,
        el.monthly_deduction,
        el.remaining_amount,
        el.start_date,
        el.end_date,
        CASE 
          WHEN lp.loan_id IS NOT NULL THEN TRUE
          ELSE FALSE
        END as already_paid_this_month
      FROM employee_loans el
      LEFT JOIN loan_payments lp ON el.id = lp.loan_id AND lp.payroll_month = ?
      WHERE el.employee_id = ?
        AND el.status = 'active'
        AND el.remaining_amount > 0
        AND el.start_date <= LAST_DAY(STR_TO_DATE(?, '%Y-%m'))
      ORDER BY el.start_date ASC
    `, [payroll_month, employee_id, payroll_month]);
    
    res.json(results);
  } catch (err) {
    console.error('Error fetching active loans for employee:', err);
    res.status(500).json({ error: err.message });
  }
};

// Record loan payment (typically called from payroll processing)
exports.recordLoanPayment = async (req, res) => {
  try {
    const {
      loan_id,
      amount_paid,
      payroll_month,
      payment_date
    } = req.body;
    
    if (!loan_id || !amount_paid || !payroll_month) {
      return res.status(400).json({
        error: 'Loan ID, amount paid, and payroll month are required'
      });
    }
    
    // Get loan details
    const loan = await query(
      'SELECT * FROM employee_loans WHERE id = ?',
      [loan_id]
    );
    
    if (loan.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    const loanData = loan[0];
    const paidAmount = parseFloat(amount_paid);
    const newRemainingAmount = Math.max(0, parseFloat(loanData.remaining_amount) - paidAmount);
    
    // Record payment
    const paymentResult = await query(`
      INSERT INTO loan_payments (
        loan_id,
        employee_id,
        payment_date,
        amount_paid,
        remaining_balance,
        payroll_month
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      loan_id,
      loanData.employee_id,
      payment_date || moment().format('YYYY-MM-DD'),
      paidAmount,
      newRemainingAmount,
      payroll_month
    ]);
    
    // Update loan remaining amount
    await query(
      'UPDATE employee_loans SET remaining_amount = ?, status = ? WHERE id = ?',
      [
        newRemainingAmount,
        newRemainingAmount <= 0 ? 'completed' : loanData.status,
        loan_id
      ]
    );
    
    res.json({
      payment_id: paymentResult.insertId,
      loan_id,
      amount_paid: paidAmount,
      new_remaining_amount: newRemainingAmount,
      status: newRemainingAmount <= 0 ? 'completed' : loanData.status,
      message: 'Payment recorded successfully'
    });
  } catch (err) {
    // Handle duplicate payment for same month
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'Payment for this loan in the specified month has already been recorded'
      });
    }
    console.error('Error recording loan payment:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get loan summary for employee
exports.getLoanSummaryForEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    const summary = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_loans,
        COALESCE(SUM(CASE WHEN status = 'active' THEN remaining_amount ELSE 0 END), 0) as total_remaining,
        COALESCE(SUM(CASE WHEN status = 'active' THEN monthly_deduction ELSE 0 END), 0) as total_monthly_deduction
      FROM employee_loans
      WHERE employee_id = ?
    `, [employee_id]);
    
    const recentPayments = await query(`
      SELECT 
        lp.payment_date,
        lp.amount_paid,
        el.title as loan_title
      FROM loan_payments lp
      JOIN employee_loans el ON lp.loan_id = el.id
      WHERE lp.employee_id = ?
      ORDER BY lp.payment_date DESC
      LIMIT 5
    `, [employee_id]);
    
    res.json({
      summary: summary[0],
      recent_payments: recentPayments
    });
  } catch (err) {
    console.error('Error fetching loan summary:', err);
    res.status(500).json({ error: err.message });
  }
};

// Process loan payments for payroll (utility function)
exports.processLoanPaymentsForPayroll = async (employee_id, payroll_month, payment_date = null) => {
  try {
    console.log(`Processing loan payments for employee ${employee_id}, month ${payroll_month}`);
    
    // Get active loans for the employee
    const activeLoans = await query(`
      SELECT 
        el.id,
        el.title,
        el.monthly_deduction,
        el.remaining_amount,
        CASE 
          WHEN lp.loan_id IS NOT NULL THEN TRUE
          ELSE FALSE
        END as already_paid_this_month
      FROM employee_loans el
      LEFT JOIN loan_payments lp ON el.id = lp.loan_id AND lp.payroll_month = ?
      WHERE el.employee_id = ?
        AND el.status = 'active'
        AND el.remaining_amount > 0
        AND el.start_date <= LAST_DAY(STR_TO_DATE(?, '%Y-%m'))
      ORDER BY el.start_date ASC
    `, [payroll_month, employee_id, payroll_month]);
    
    const processedPayments = [];
    let totalDeductions = 0;
    
    for (const loan of activeLoans) {
      if (!loan.already_paid_this_month) {
        const deductionAmount = Math.min(loan.monthly_deduction, loan.remaining_amount);
        const newRemainingAmount = Math.max(0, parseFloat(loan.remaining_amount) - deductionAmount);
        
        // Record payment
        const paymentResult = await query(`
          INSERT INTO loan_payments (
            loan_id,
            employee_id,
            payment_date,
            amount_paid,
            remaining_balance,
            payroll_month
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          loan.id,
          employee_id,
          payment_date || moment().format('YYYY-MM-DD'),
          deductionAmount,
          newRemainingAmount,
          payroll_month
        ]);
        
        // Update loan remaining amount and status
        await query(
          'UPDATE employee_loans SET remaining_amount = ?, status = ? WHERE id = ?',
          [
            newRemainingAmount,
            newRemainingAmount <= 0 ? 'completed' : 'active',
            loan.id
          ]
        );
        
        processedPayments.push({
          loan_id: loan.id,
          loan_title: loan.title,
          amount_paid: deductionAmount,
          new_remaining_amount: newRemainingAmount,
          status: newRemainingAmount <= 0 ? 'completed' : 'active',
          payment_id: paymentResult.insertId
        });
        
        totalDeductions += deductionAmount;
        
        console.log(`Processed loan payment: ${loan.title} - AED ${deductionAmount}, remaining: AED ${newRemainingAmount}`);
      }
    }
    
    return {
      success: true,
      total_deductions: totalDeductions,
      processed_payments: processedPayments,
      message: `Processed ${processedPayments.length} loan payments for employee ${employee_id}`
    };
    
  } catch (err) {
    console.error('Error processing loan payments for payroll:', err);
    return {
      success: false,
      error: err.message,
      total_deductions: 0,
      processed_payments: []
    };
  }
};
