/**
 * Loan Controller - Manages employee loan operations and payment tracking
 * Handles loan creation, updates, payments, and status management
 */
const { query } = require('../utils/dbPromise');
const moment = require('moment');
const { logAudit } = require('../middleware/auditMiddleware');

// Helper to update loan status based on remaining amount
// ✅ ENHANCED: Helper to update loan status with better completion logic
const updateLoanStatus = async (loanId) => {
  try {
    console.log(`🔍 Starting status check for loan ${loanId}`);
    
    // Get current loan data with more fields for debugging
    const currentLoan = await query(
      'SELECT remaining_amount, status, total_loan_amount, amount_deducted, total_amount, amount_added FROM employee_loans WHERE id = ?',
      [loanId]
    );

    if (currentLoan.length === 0) {
      console.log(`⚠️ Loan ${loanId} not found`);
      return;
    }

    const loan = currentLoan[0];
    const remainingAmount = parseFloat(loan.remaining_amount || 0);
    const totalLoanAmount = parseFloat(loan.total_loan_amount || 0);
    const totalOriginal = parseFloat(loan.total_amount || 0);
    const amountAdded = parseFloat(loan.amount_added || 0);
    const amountDeducted = parseFloat(loan.amount_deducted || 0);

    console.log(`🔍 Loan ${loanId} details:`, {
      remainingAmount,
      totalLoanAmount,
      currentStatus: loan.status,
      totalOriginal,
      amountAdded,
      amountDeducted,
      isFullyPaid: remainingAmount <= 0.01,
      isTotalZero: totalLoanAmount <= 0.01
    });

    // ✅ FIXED: Check if loan should be completed
    // A loan is completed if either:
    // 1. remaining_amount <= 0.01 OR
    // 2. total_loan_amount <= 0.01 (deducted to zero or below)
    const shouldBeCompleted = (remainingAmount <= 0.01) || (totalLoanAmount <= 0.01);
    const shouldBeActive = (remainingAmount > 0.01) && (totalLoanAmount > 0.01);

    if (shouldBeCompleted && loan.status !== 'completed') {
      await query(
        'UPDATE employee_loans SET status = ?, remaining_amount = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', loanId]
      );
      console.log(`🎉 Loan ${loanId} marked as COMPLETED! (remaining: ${remainingAmount}, total: ${totalLoanAmount})`);
      return 'completed';
    }
    // If loan has outstanding amount but was marked as completed, reactivate it
    else if (shouldBeActive && loan.status === 'completed') {
      await query(
        'UPDATE employee_loans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['active', loanId]
      );
      console.log(`🔄 Loan ${loanId} REACTIVATED! (remaining: ${remainingAmount}, total: ${totalLoanAmount})`);
      return 'active';
    } else {
      console.log(`ℹ️ Loan ${loanId} status unchanged: remaining=${remainingAmount}, total=${totalLoanAmount}, status=${loan.status}`);
      return loan.status;
    }
  } catch (error) {
    console.error(`❌ Error updating loan status for loan ${loanId}:`, error);
    return null;
  }
};

// ================ LOAN CONTROLLERS ================

// Get all loans with employee details (FIXED total_paid calculation)
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
        ROUND(el.total_amount, 2) as total_amount,
        ROUND(el.amount_added, 2) as amount_added,
        ROUND(el.amount_deducted, 2) as amount_deducted,
        ROUND(el.total_loan_amount, 2) as total_loan_amount,
        el.description,
        el.start_date,
        el.end_date,
        el.status,
        ROUND(el.remaining_amount, 2) as remaining_amount,
        ROUND(el.monthly_deduction, 2) as monthly_deduction,
        el.created_by,
        el.created_at,
        el.updated_at,
        -- Fixed total_paid calculation using subquery
        COALESCE(ROUND((
          SELECT SUM(lp.amount_paid) 
          FROM loan_payments lp 
          WHERE lp.loan_id = el.id 
          AND lp.amount_paid > 0
        ), 2), 0.00) as total_paid,
        COALESCE((
          SELECT COUNT(*) 
          FROM loan_payments lp 
          WHERE lp.loan_id = el.id
        ), 0) as payment_count,
        CASE 
          WHEN el.remaining_amount <= 0 THEN 'completed'
          WHEN el.start_date > CURDATE() THEN 'pending'
          ELSE el.status
        END as computed_status
      FROM employee_loans el
      LEFT JOIN employees e ON el.employee_id = e.employeeId
      ${whereClause}
      ORDER BY el.created_at DESC
    `, params);
    
    // Format the results to ensure proper number formatting
    const formattedResults = results.map(loan => ({
      ...loan,
      total_amount: parseFloat(loan.total_amount || 0).toFixed(2),
      amount_added: parseFloat(loan.amount_added || 0).toFixed(2),
      amount_deducted: parseFloat(loan.amount_deducted || 0).toFixed(2),
      total_loan_amount: parseFloat(loan.total_loan_amount || 0).toFixed(2),
      remaining_amount: parseFloat(loan.remaining_amount || 0).toFixed(2),
      total_paid: parseFloat(loan.total_paid || 0).toFixed(2)
    }));
    
    res.json(formattedResults);
  } catch (err) {
    console.error('Error fetching loans:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get complete loan history for an employee (FIXED)
exports.getEmployeeLoanHistory = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    // Get employee details
    const employeeResult = await query(
      'SELECT employeeId, name, monthlySalary FROM employees WHERE employeeId = ?',
      [employee_id]
    );
    
    if (employeeResult.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Get all loans for this employee with proper total_paid calculation
    const loans = await query(`
      SELECT 
        el.id,
        el.total_amount,
        el.amount_added,
        el.amount_deducted,
        el.total_loan_amount,
        el.remaining_amount,
        el.monthly_deduction,
        el.created_by,
        el.approved_by,
        el.created_at,
        el.updated_at,
        el.description,
        el.created_at,
        -- Fixed: Use subquery to get accurate total_paid
        COALESCE((
          SELECT SUM(lp.amount_paid) 
          FROM loan_payments lp 
          WHERE lp.loan_id = el.id 
          AND lp.amount_paid > 0
        ), 0) as total_paid
      FROM employee_loans el
      WHERE el.employee_id = ?
      ORDER BY el.created_at DESC
    `, [employee_id]);
    
    // ✅ ENHANCED: Update loan statuses and get fresh data
    for (const loan of loans) {
      await updateLoanStatus(loan.id);
    }
    
    // ✅ ENHANCED: Refresh loan data after status updates
    const updatedLoans = await query(`
      SELECT 
        el.id,
        el.total_amount,
        el.amount_added,
        el.amount_deducted,
        el.total_loan_amount,
        el.remaining_amount,
        el.start_date,
        el.end_date,
        el.status,
        el.description,
        el.created_at,
        COALESCE((
          SELECT SUM(lp.amount_paid) 
          FROM loan_payments lp 
          WHERE lp.loan_id = el.id 
          AND lp.amount_paid > 0
        ), 0) as total_paid
      FROM employee_loans el
      WHERE el.employee_id = ?
      ORDER BY el.created_at DESC
    `, [employee_id]);
    
    // Get all payment history for this employee
    const paymentHistory = await query(`
      SELECT 
        lp.id,
        lp.loan_id,
        lp.payment_date,
        lp.amount_paid,
        lp.remaining_balance,
        lp.payroll_month,
        lp.created_at
      FROM loan_payments lp
      JOIN employee_loans el ON lp.loan_id = el.id
      WHERE el.employee_id = ?
      ORDER BY lp.payment_date DESC, lp.created_at DESC
    `, [employee_id]);
    
    // ✅ ENHANCED: Calculate summary statistics using updated loan data
    const totalLoans = updatedLoans.length;
    const activeLoans = updatedLoans.filter(loan => loan.status === 'active').length;
    const completedLoans = updatedLoans.filter(loan => loan.status === 'completed').length;
    const totalLoanAmount = updatedLoans.reduce((sum, loan) => sum + parseFloat(loan.total_loan_amount || 0), 0);
    const totalPaid = updatedLoans.reduce((sum, loan) => sum + parseFloat(loan.total_paid || 0), 0);
    const totalRemaining = updatedLoans.reduce((sum, loan) => sum + parseFloat(loan.remaining_amount || 0), 0);
    const totalOriginalAmount = updatedLoans.reduce((sum, loan) => sum + parseFloat(loan.total_amount || 0), 0);
    const totalAmountAdded = updatedLoans.reduce((sum, loan) => sum + parseFloat(loan.amount_added || 0), 0);
    const totalAmountDeducted = updatedLoans.reduce((sum, loan) => sum + parseFloat(loan.amount_deducted || 0), 0);
    
    res.json({
      success: true,
      employee: {
        ...employeeResult[0],
        employee_id: employeeResult[0].employeeId
      },
      summary: {
        total_loans: totalLoans,
        active_loans: activeLoans,
        completed_loans: completedLoans,
        total_original_amount: totalOriginalAmount.toFixed(2),
        total_amount_added: totalAmountAdded.toFixed(2),
        total_amount_deducted: totalAmountDeducted.toFixed(2),
        total_loan_amount: totalLoanAmount.toFixed(2),
        total_paid: totalPaid.toFixed(2),
        total_remaining: totalRemaining.toFixed(2)
      },
      loans: updatedLoans.map(loan => ({
        ...loan,
        total_amount: parseFloat(loan.total_amount || 0).toFixed(2),
        amount_added: parseFloat(loan.amount_added || 0).toFixed(2),
        amount_deducted: parseFloat(loan.amount_deducted || 0).toFixed(2),
        total_loan_amount: parseFloat(loan.total_loan_amount || 0).toFixed(2),
        remaining_amount: parseFloat(loan.remaining_amount || 0).toFixed(2),
        total_paid: parseFloat(loan.total_paid || 0).toFixed(2)
      })),
      payment_history: paymentHistory.map(payment => ({
        ...payment,
        amount_paid: parseFloat(payment.amount_paid || 0).toFixed(2),
        remaining_balance: parseFloat(payment.remaining_balance || 0).toFixed(2)
      }))
    });
  } catch (err) {
    console.error('Error fetching employee loan history:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ NEW: Get transaction history for an employee
exports.getEmployeeTransactionHistory = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    // Get employee details first to verify they exist
    const employeeResult = await query(
      'SELECT employeeId, name FROM employees WHERE employeeId = ?',
      [employee_id]
    );
    
    if (employeeResult.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Get transaction history from loan_transactions table
    const transactions = await query(`
      SELECT 
        lt.id,
        lt.loan_id,
        lt.transaction_type,
        lt.amount,
        lt.reason,
        lt.balance_before,
        lt.balance_after,
        lt.created_by,
        lt.created_at
      FROM loan_transactions lt
      JOIN employee_loans el ON lt.loan_id = el.id
      WHERE lt.employee_id = ?
      ORDER BY lt.created_at DESC
    `, [employee_id]);
    
    console.log(`✅ Found ${transactions.length} transactions for employee ${employee_id}`);
    
    res.json({
      success: true,
      employee: employeeResult[0],
      transactions: transactions.map(transaction => ({
        ...transaction,
        amount: parseFloat(transaction.amount || 0).toFixed(2),
        balance_before: parseFloat(transaction.balance_before || 0).toFixed(2),
        balance_after: parseFloat(transaction.balance_after || 0).toFixed(2)
      }))
    });
    
  } catch (err) {
    console.error('Error fetching employee transaction history:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get loan by ID with payment history (UPDATED)
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
        ROUND(el.total_amount, 2) as total_amount,
        ROUND(el.amount_added, 2) as amount_added,
        ROUND(el.amount_deducted, 2) as amount_deducted,
        ROUND(el.total_loan_amount, 2) as total_loan_amount,
        el.description,
        el.start_date,
        el.end_date,
        el.status,
        ROUND(el.remaining_amount, 2) as remaining_amount,
        el.created_by,
        el.created_at,
        el.updated_at,
        -- Fixed total_paid calculation
        COALESCE((
          SELECT SUM(lp.amount_paid) 
          FROM loan_payments lp 
          WHERE lp.loan_id = el.id 
          AND lp.amount_paid > 0
        ), 0) as total_paid
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
        ROUND(amount_paid, 2) as amount_paid,
        ROUND(remaining_balance, 2) as remaining_balance,
        payroll_month,
        created_at
      FROM loan_payments
      WHERE loan_id = ?
      ORDER BY payment_date DESC
    `, [id]);
    
    const loan = loanResult[0];
    
    // Format the loan data
    loan.total_amount = parseFloat(loan.total_amount || 0).toFixed(2);
    loan.amount_added = parseFloat(loan.amount_added || 0).toFixed(2);
    loan.amount_deducted = parseFloat(loan.amount_deducted || 0).toFixed(2);
    loan.total_loan_amount = parseFloat(loan.total_loan_amount || 0).toFixed(2);
    loan.remaining_amount = parseFloat(loan.remaining_amount || 0).toFixed(2);
    loan.total_paid = parseFloat(loan.total_paid || 0).toFixed(2);
    
    // Format payment history
    loan.payment_history = payments.map(payment => ({
      ...payment,
      amount_paid: parseFloat(payment.amount_paid || 0).toFixed(2),
      remaining_balance: parseFloat(payment.remaining_balance || 0).toFixed(2)
    }));
    
    res.json(loan);
  } catch (err) {
    console.error('Error fetching loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new loan (UPDATED)
exports.createLoan = async (req, res) => {
  try {
    // Handle null prototype objects from body parser
    let body;
    try {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = JSON.parse(JSON.stringify(req.body));
      }
    } catch (e) {
      console.error('Error parsing loan creation request body:', e);
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const { 
      employee_id, 
      total_amount, 
      monthly_deduction,
      description, 
      start_date,
      approved_by
    } = body;
    
    // Validation
    if (!employee_id ||  !total_amount || !start_date) {
      return res.status(400).json({ 
        error: 'Employee ID, total amount, and start date are required' 
      });
    }
    
    const totalAmountFloat = parseFloat(total_amount);
    if (totalAmountFloat <= 0) {
      return res.status(400).json({ 
        error: 'Total amount must be a positive number' 
      });
    }
    
    // Validate monthly_deduction if provided (optional field)
    let monthlyDeductionFloat = null;
    if (monthly_deduction !== undefined && monthly_deduction !== null && monthly_deduction !== '') {
      monthlyDeductionFloat = parseFloat(monthly_deduction);
      if (isNaN(monthlyDeductionFloat) || monthlyDeductionFloat < 0) {
        return res.status(400).json({ 
          error: 'Monthly deduction must be a non-negative number' 
        });
      }
    }
    
    // Check if employee exists
    const employeeCheck = await query(
      'SELECT employeeId FROM employees WHERE employeeId = ?',
      [employee_id]
    );
    
    if (employeeCheck.length === 0) {
      return res.status(400).json({ error: 'Employee not found' });
    }
    
    // Get created_by from token (assuming it's available in req.user)
    const createdBy = req.user ? req.user.username : 'system';
    
    // Calculate total_loan_amount properly: total_amount + amount_added - amount_deducted
    const initialAmountAdded = 0.00;
    const initialAmountDeducted = 0.00;
    const calculatedTotalLoanAmount = totalAmountFloat + initialAmountAdded - initialAmountDeducted;
    
    const result = await query(`
      INSERT INTO employee_loans (
        employee_id, 
        total_amount, 
        amount_added,
        amount_deducted,
        total_loan_amount,
        description, 
        start_date, 
        remaining_amount,
        monthly_deduction,
        created_by,
        approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employee_id,
      totalAmountFloat,
      initialAmountAdded,
      initialAmountDeducted,
      calculatedTotalLoanAmount, // This should equal total_amount initially
      description || null,
      start_date,
      calculatedTotalLoanAmount, // remaining_amount equals total_loan_amount initially
      monthlyDeductionFloat, // Include the validated monthly_deduction
      createdBy,
      approved_by || null
    ]);
    
    res.status(201).json({
      success: true,
      id: result.insertId,
      employee_id,
      total_amount: totalAmountFloat.toFixed(2),
      amount_added: initialAmountAdded.toFixed(2),
      amount_deducted: initialAmountDeducted.toFixed(2),
      total_loan_amount: calculatedTotalLoanAmount.toFixed(2),
      description,
      start_date,
      remaining_amount: calculatedTotalLoanAmount.toFixed(2),
      status: 'active',
      message: 'Loan created successfully'
    });
  } catch (err) {
    console.error('Error creating loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add amount to existing loan (UPDATED: Record transactions in loan_transactions table)
exports.addAmountToLoan = async (req, res) => {
  const { id } = req.params;
  
  // Handle null prototype objects from body parser
  let body;
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = JSON.parse(JSON.stringify(req.body));
    }
  } catch (e) {
    console.error('Error parsing add loan amount request body:', e);
    return res.status(400).json({ error: 'Invalid request data' });
  }

  const { additional_amount, reason } = body;
  try {
    console.log(`➕ Adding amount to loan ${id}:`, { additional_amount, reason });
    const additionalAmount = parseFloat(additional_amount);
    if (isNaN(additionalAmount) || additionalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid additional amount' });
    }
    // Get current loan data
    const currentLoan = await query(
      'SELECT * FROM employee_loans WHERE id = ?',
      [id]
    );
    if (currentLoan.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    const loan = currentLoan[0];
    
    // Store balance before transaction
    const balanceBefore = parseFloat(loan.remaining_amount || 0);
    
    // ✅ Add to existing amount_added instead of replacing
    const currentAmountAdded = parseFloat(loan.amount_added || 0);
    const newAmountAdded = currentAmountAdded + additionalAmount;
    // Recalculate totals
    const originalAmount = parseFloat(loan.total_amount);
    const currentAmountDeducted = parseFloat(loan.amount_deducted || 0);
    const newTotalLoanAmount = originalAmount + newAmountAdded - currentAmountDeducted;
    const currentPaid = parseFloat(loan.total_paid || 0);
    const newRemainingAmount = Math.max(0, newTotalLoanAmount - currentPaid);
    
    // Update the loan
    await query(`
      UPDATE employee_loans 
      SET 
        amount_added = ?,
        total_loan_amount = ?,
        remaining_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newAmountAdded, newTotalLoanAmount, newRemainingAmount, id]);
    
    // ✅ NEW: Record transaction in loan_transactions table
    try {
      const createdBy = req.user?.username || req.user?.name || 'Admin User';
      await query(`
        INSERT INTO loan_transactions (
          loan_id, employee_id, transaction_type, amount, reason, 
          balance_before, balance_after, created_by
        ) VALUES (?, ?, 'add', ?, ?, ?, ?, ?)
      `, [
        id, 
        loan.employee_id, 
        additionalAmount, 
        reason || 'Amount added via loan management', 
        balanceBefore, 
        newRemainingAmount,
        createdBy
      ]);
      console.log(`📝 Transaction recorded: Added ${additionalAmount} to loan ${id} by ${createdBy}`);
    } catch (transactionError) {
      console.warn('⚠️ Failed to record transaction, but loan update succeeded:', transactionError.message);
    }
    
    // ✅ Add this at the end before sending response
    await updateLoanStatus(id);
    console.log(`✅ Successfully added ${additionalAmount} to loan ${id}`);
    res.json({
      success: true,
      message: `Added AED ${additionalAmount} to loan successfully`,
      loan_id: parseInt(id),
      additional_amount: additionalAmount,
      new_amount_added: newAmountAdded,
      new_total_loan_amount: newTotalLoanAmount,
      new_remaining_amount: newRemainingAmount,
      reason: reason || 'Amount added'
    });
  } catch (err) {
    console.error('Error adding amount to loan:', err);
    res.status(500).json({ error: 'Failed to add amount to loan' });
  }
};

// Deduct amount from existing loan (UPDATED: Record transactions in loan_transactions table)
exports.deductAmountFromLoan = async (req, res) => {
  const { id } = req.params;
  
  // Handle null prototype objects from body parser
  let body;
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = JSON.parse(JSON.stringify(req.body));
    }
  } catch (e) {
    console.error('Error parsing deduct loan amount request body:', e);
    return res.status(400).json({ error: 'Invalid request data' });
  }

  const { deduction_amount, reason, record_as_payment } = body;
  try {
    console.log(`➖ Deducting amount from loan ${id}:`, { deduction_amount, reason, record_as_payment });
    const deductAmount = parseFloat(deduction_amount);
    if (isNaN(deductAmount) || deductAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deduction amount' });
    }
    // Get current loan data
    const currentLoan = await query(
      'SELECT * FROM employee_loans WHERE id = ?',
      [id]
    );
    if (currentLoan.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    const loan = currentLoan[0];
    
    // Store balance before transaction
    const balanceBefore = parseFloat(loan.remaining_amount || 0);
    
    // ✅ Add to existing amount_deducted instead of replacing
    const currentAmountDeducted = parseFloat(loan.amount_deducted || 0);
    const newAmountDeducted = currentAmountDeducted + deductAmount;
    // Recalculate totals
    const originalAmount = parseFloat(loan.total_amount);
    const currentAmountAdded = parseFloat(loan.amount_added || 0);
    const newTotalLoanAmount = originalAmount + currentAmountAdded - newAmountDeducted;
    const currentPaid = parseFloat(loan.total_paid || 0);
    const newRemainingAmount = Math.max(0, newTotalLoanAmount - currentPaid);
    
    // Update the loan
    await query(`
      UPDATE employee_loans 
      SET 
        amount_deducted = ?,
        total_loan_amount = ?,
        remaining_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newAmountDeducted, newTotalLoanAmount, newRemainingAmount, id]);
    
    // Record as payment if requested (optional since we're not tracking payments)
    if (record_as_payment) {
      await query(`
        INSERT INTO loan_payments (loan_id, amount_paid, payment_date, payroll_month) 
        VALUES (?, ?, CURDATE(), DATE_FORMAT(CURDATE(), '%Y-%m'))
      `, [id, deductAmount]);
    }
    
    // ✅ NEW: Record transaction in loan_transactions table
    try {
      const createdBy = req.user?.username || req.user?.name || 'Admin User';
      await query(`
        INSERT INTO loan_transactions (
          loan_id, employee_id, transaction_type, amount, reason, 
          balance_before, balance_after, created_by
        ) VALUES (?, ?, 'deduct', ?, ?, ?, ?, ?)
      `, [
        id, 
        loan.employee_id, 
        deductAmount, 
        reason || 'Amount deducted via loan management', 
        balanceBefore, 
        newRemainingAmount,
        createdBy
      ]);
      console.log(`📝 Transaction recorded: Deducted ${deductAmount} from loan ${id} by ${createdBy}`);
    } catch (transactionError) {
      console.warn('⚠️ Failed to record transaction, but loan update succeeded:', transactionError.message);
    }
    
    // ✅ Add this at the end before sending response
    await updateLoanStatus(id);
    console.log(`✅ Successfully deducted ${deductAmount} from loan ${id}`);
    res.json({
      success: true,
      message: `Deducted AED ${deductAmount} from loan successfully`,
      loan_id: parseInt(id),
      deduction_amount: deductAmount,
      new_amount_deducted: newAmountDeducted,
      new_total_loan_amount: newTotalLoanAmount,
      new_remaining_amount: newRemainingAmount,
      payment_recorded: record_as_payment,
      reason: reason || 'Amount deducted'
    });
  } catch (err) {
    console.error('Error deducting amount from loan:', err);
    res.status(500).json({ error: 'Failed to deduct amount from loan' });
  }
};

// Combined adjustment function (UPDATED)
exports.adjustLoanAmount = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle null prototype objects from body parser
    let body;
    try {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = JSON.parse(JSON.stringify(req.body));
      }
    } catch (e) {
      console.error('Error parsing adjust loan amount request body:', e);
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const { adjustment_type, amount, reason } = body;
    
    if (!adjustment_type || !['add', 'deduct'].includes(adjustment_type)) {
      return res.status(400).json({ 
        error: 'Adjustment type must be either "add" or "deduct"' 
      });
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        error: 'Amount must be a positive number' 
      });
    }
    
    // Create new request object to avoid modifying original
    const newReq = { ...req };
    
    if (adjustment_type === 'add') {
      newReq.body = { additional_amount: amount, reason };
      return exports.addAmountToLoan(newReq, res);
    } else {
      newReq.body = { deduction_amount: amount, reason };
      return exports.deductAmountFromLoan(newReq, res);
    }
    
  } catch (err) {
    console.error('Error adjusting loan amount:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update loan (UPDATED)
exports.updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle null prototype objects from body parser
    let body;
    try {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = JSON.parse(JSON.stringify(req.body));
      }
    } catch (e) {
      console.error('Error parsing loan update request body:', e);
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const { 
      total_amount, 
      description, 
      start_date,
      monthly_deduction,
      status,
      amount_added,
      amount_deducted
    } = body;
    
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
    
    
    
    if (total_amount !== undefined) {
      const totalAmountFloat = parseFloat(total_amount);
      if (totalAmountFloat <= 0) {
        return res.status(400).json({ error: 'Total amount must be a positive number' });
      }
      updateFields.push('total_amount = ?');
      params.push(totalAmountFloat);
    }
    
    if (amount_added !== undefined) {
      const amountAddedFloat = parseFloat(amount_added);
      if (amountAddedFloat < 0) {
        return res.status(400).json({ error: 'Amount added cannot be negative' });
      }
      updateFields.push('amount_added = ?');
      params.push(amountAddedFloat);
    }
    
    if (amount_deducted !== undefined) {
      const amountDeductedFloat = parseFloat(amount_deducted);
      if (amountDeductedFloat < 0) {
        return res.status(400).json({ error: 'Amount deducted cannot be negative' });
      }
      updateFields.push('amount_deducted = ?');
      params.push(amountDeductedFloat);
    }
    
    // Recalculate total_loan_amount if any of the base amounts changed
    if (total_amount !== undefined || amount_added !== undefined || amount_deducted !== undefined) {
      const newTotalAmount = total_amount !== undefined ? parseFloat(total_amount) : parseFloat(loan.total_amount);
      const newAmountAdded = amount_added !== undefined ? parseFloat(amount_added) : parseFloat(loan.amount_added || 0);
      const newAmountDeducted = amount_deducted !== undefined ? parseFloat(amount_deducted) : parseFloat(loan.amount_deducted || 0);
      
      const newTotalLoanAmount = newTotalAmount + newAmountAdded - newAmountDeducted;
      
      if (newTotalLoanAmount < 0) {
        return res.status(400).json({ 
          error: 'Total loan amount cannot be negative. Please adjust the deduction amount.' 
        });
      }
      
      updateFields.push('total_loan_amount = ?');
      params.push(newTotalLoanAmount);
      
      // Also update remaining amount proportionally
      const currentPaidAmount = parseFloat(loan.total_loan_amount) - parseFloat(loan.remaining_amount);
      const newRemainingAmount = Math.max(0, newTotalLoanAmount - currentPaidAmount);
      updateFields.push('remaining_amount = ?');
      params.push(newRemainingAmount);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    
    if (start_date !== undefined) {
      updateFields.push('start_date = ?');
      params.push(start_date);
    }
    
    // Handle monthly_deduction field
    if (monthly_deduction !== undefined) {
      let monthlyDeductionFloat = null;
      if (monthly_deduction !== null && monthly_deduction !== '' && monthly_deduction !== '0') {
        monthlyDeductionFloat = parseFloat(monthly_deduction);
        if (isNaN(monthlyDeductionFloat) || monthlyDeductionFloat < 0) {
          return res.status(400).json({ error: 'Monthly deduction must be a non-negative number' });
        }
      }
      updateFields.push('monthly_deduction = ?');
      params.push(monthlyDeductionFloat);
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
    
    params.push(id);
    
    const result = await query(
      `UPDATE employee_loans SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    // Return updated loan with fixed total_paid calculation
    const updatedLoan = await query(
      `SELECT 
        id,
        employee_id,
        ROUND(total_amount, 2) as total_amount,
        ROUND(amount_added, 2) as amount_added,
        ROUND(amount_deducted, 2) as amount_deducted,
        ROUND(total_loan_amount, 2) as total_loan_amount,
        ROUND(monthly_deduction, 2) as monthly_deduction,
        description,
        DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
        end_date,
        status,
        ROUND(remaining_amount, 2) as remaining_amount,
        created_by,
        created_at,
        updated_at,
        COALESCE((
          SELECT SUM(lp.amount_paid) 
          FROM loan_payments lp 
          WHERE lp.loan_id = ?
          AND lp.amount_paid > 0
        ), 0) as total_paid
      FROM employee_loans WHERE id = ?`,
      [id, id]
    );
    
    const formattedLoan = {
      ...updatedLoan[0],
      total_amount: parseFloat(updatedLoan[0].total_amount || 0).toFixed(2),
      amount_added: parseFloat(updatedLoan[0].amount_added || 0).toFixed(2),
      amount_deducted: parseFloat(updatedLoan[0].amount_deducted || 0).toFixed(2),
      total_loan_amount: parseFloat(updatedLoan[0].total_loan_amount || 0).toFixed(2),
      remaining_amount: parseFloat(updatedLoan[0].remaining_amount || 0).toFixed(2),
      total_paid: parseFloat(updatedLoan[0].total_paid || 0).toFixed(2),
      message: 'Loan updated successfully'
    };
    
    res.json({
      success: true,
      data: formattedLoan
    });
  } catch (err) {
    console.error('Error updating loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete loan (UNCHANGED)
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
    
    res.json({ 
      success: true,
      message: 'Loan deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting loan:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ NEW: Delete all loans for a specific employee
exports.deleteEmployeeLoans = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    console.log(`🔄 Attempting to delete all loans for employee: ${employee_id}`);
    
    // First, verify the employee exists
    const employeeCheck = await query(
      'SELECT employeeId, name FROM employees WHERE employeeId = ?',
      [employee_id]
    );
    
    if (employeeCheck.length === 0) {
      console.log(`❌ Employee not found: ${employee_id}`);
      return res.status(404).json({ 
        error: 'Employee not found',
        employee_id 
      });
    }
    
    const employee = employeeCheck[0];
    console.log(`👤 Found employee: ${employee.name} (${employee_id})`);
    
    // Get all loans for this employee
    const existingLoans = await query(
      'SELECT id, total_loan_amount, remaining_amount FROM employee_loans WHERE employee_id = ?',
      [employee_id]
    );
    
    if (existingLoans.length === 0) {
      console.log(`ℹ️ No loans found for employee: ${employee_id}`);
      return res.status(404).json({ 
        error: 'No loans found for this employee',
        employee_id,
        employee_name: employee.name
      });
    }
    
    console.log(`📋 Found ${existingLoans.length} loans for employee ${employee_id}:`);
    existingLoans.forEach(loan => {
      console.log(`  - Loan #${loan.id}: Loan #${loan.id} (AED ${loan.remaining_amount} remaining)`);
    });
    
    // Check if any loans have payments - this determines if we allow deletion
    const paymentsCheck = await query(`
      SELECT COUNT(*) as payment_count, COUNT(DISTINCT loan_id) as loans_with_payments
      FROM loan_payments lp 
      JOIN employee_loans el ON lp.loan_id = el.id
      WHERE el.employee_id = ?
    `, [employee_id]);
    
    const { payment_count, loans_with_payments } = paymentsCheck[0];
    
    if (payment_count > 0) {
      console.log(`⚠️ Found ${payment_count} payments across ${loans_with_payments} loans - deletion not allowed`);
      return res.status(400).json({
        error: `Cannot delete employee loans with existing payment history. Found ${payment_count} payment records across ${loans_with_payments} loans. Consider marking loans as completed instead.`,
        employee_id,
        employee_name: employee.name,
        total_loans: existingLoans.length,
        loans_with_payments: parseInt(loans_with_payments),
        total_payments: parseInt(payment_count)
      });
    }
    
    // Delete all loans for the employee (since no payments exist)
    const deleteResult = await query(
      'DELETE FROM employee_loans WHERE employee_id = ?',
      [employee_id]
    );
    
    const deletedCount = deleteResult.affectedRows;
    console.log(`✅ Successfully deleted ${deletedCount} loans for employee ${employee_id}`);
    
    res.json({
      success: true,
      message: `Successfully deleted all ${deletedCount} loan(s) for employee ${employee.name}`,
      employee_id,
      employee_name: employee.name,
      deleted_loans_count: deletedCount,
      deleted_loans: existingLoans.map(loan => ({
        id: loan.id,
        amount: parseFloat(loan.total_loan_amount || 0).toFixed(2)
      }))
    });
    
  } catch (err) {
    console.error('❌ Error deleting employee loans:', err);
    res.status(500).json({ 
      error: 'Failed to delete employee loans',
      details: err.message,
      employee_id: req.params.employee_id
    });
  }
};

// Get active loans for salary calculation (UPDATED)
exports.getActiveLoansForEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { payroll_month } = req.query;
    
    if (!payroll_month) {
      return res.status(400).json({ error: 'Payroll month is required (format: YYYY-MM)' });
    }
    
    const results = await query(`
      SELECT 
        el.id,
        ROUND(el.total_loan_amount, 2) as total_loan_amount,
        ROUND(el.remaining_amount, 2) as remaining_amount,
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
    
    const formattedResults = results.map(loan => ({
      ...loan,
      total_loan_amount: parseFloat(loan.total_loan_amount || 0).toFixed(2),
      remaining_amount: parseFloat(loan.remaining_amount || 0).toFixed(2)
    }));
    
    res.json(formattedResults);
  } catch (err) {
    console.error('Error fetching active loans for employee:', err);
    res.status(500).json({ error: err.message });
  }
};

// Record loan payment (UPDATED)
exports.recordLoanPayment = async (req, res) => {
  const { loan_id, amount_paid, payroll_month, payment_date } = req.body;
  try {
    if (!loan_id || !amount_paid || !payroll_month) {
      return res.status(400).json({
        error: 'Loan ID, amount paid, and payroll month are required'
      });
    }
    const paidAmount = parseFloat(amount_paid);
    if (paidAmount <= 0) {
      return res.status(400).json({
        error: 'Amount paid must be a positive number'
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
    const currentRemaining = parseFloat(loanData.remaining_amount || 0);
    if (paidAmount > currentRemaining) {
      return res.status(400).json({
        error: `Payment amount (${paidAmount.toFixed(2)}) cannot exceed remaining balance (${currentRemaining.toFixed(2)})`
      });
    }
    const newRemainingAmount = Math.max(0, currentRemaining - paidAmount);
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
    // Update remaining amount and total_paid (if you want to track total_paid in the table)
    await query(`
      UPDATE employee_loans 
      SET 
        remaining_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newRemainingAmount, loan_id]);
    // ✅ Add this at the end before sending response
    await updateLoanStatus(loan_id);
    res.json({
      success: true,
      payment_id: paymentResult.insertId,
      loan_id,
      amount_paid: paidAmount.toFixed(2),
      new_remaining_amount: newRemainingAmount.toFixed(2),
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

// Get loan summary for employee (UPDATED)
exports.getLoanSummaryForEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    const summary = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_loans,
        COALESCE(ROUND(SUM(CASE WHEN status = 'active' THEN remaining_amount ELSE 0 END), 2), 0) as total_remaining,
        COALESCE(ROUND(SUM(CASE WHEN status = 'active' THEN total_loan_amount ELSE 0 END), 2), 0) as total_active_loan_amount
      FROM employee_loans
      WHERE employee_id = ?
    `, [employee_id]);
    
    const recentPayments = await query(`
      SELECT 
        lp.payment_date,
        ROUND(lp.amount_paid, 2) as amount_paid
      FROM loan_payments lp
      JOIN employee_loans el ON lp.loan_id = el.id
      WHERE lp.employee_id = ?
      ORDER BY lp.payment_date DESC
      LIMIT 5
    `, [employee_id]);
    
    const formattedSummary = {
      ...summary[0],
      total_remaining: parseFloat(summary[0].total_remaining || 0).toFixed(2),
      total_active_loan_amount: parseFloat(summary[0].total_active_loan_amount || 0).toFixed(2)
    };
    
    const formattedPayments = recentPayments.map(payment => ({
      ...payment,
      amount_paid: parseFloat(payment.amount_paid || 0).toFixed(2)
    }));
    
    res.json({
      success: true,
      summary: formattedSummary,
      recent_payments: formattedPayments
    });
  } catch (err) {
    console.error('Error fetching loan summary:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get loan transaction history for an employee
exports.getEmployeeLoanTransactions = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { loan_id, limit = 50 } = req.query;
    
    let whereConditions = ['lt.employee_id = ?'];
    let params = [employee_id];
    
    if (loan_id) {
      whereConditions.push('lt.loan_id = ?');
      params.push(loan_id);
    }
    
    params.push(parseInt(limit));
    
    const transactions = await query(`
      SELECT 
        lt.id,
        lt.loan_id,
        lt.transaction_type,
        ROUND(lt.amount, 2) as amount,
        lt.reason,
        ROUND(lt.balance_before, 2) as balance_before,
        ROUND(lt.balance_after, 2) as balance_after,
        lt.created_by,
        lt.created_at
      FROM loan_transactions lt
      LEFT JOIN employee_loans el ON lt.loan_id = el.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY lt.created_at DESC
      LIMIT ?
    `, params);
    
    // Format the transactions
    const formattedTransactions = transactions.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount || 0).toFixed(2),
      balance_before: parseFloat(transaction.balance_before || 0).toFixed(2),
      balance_after: parseFloat(transaction.balance_after || 0).toFixed(2)
    }));
    
    res.json({
      success: true,
      transactions: formattedTransactions,
      total_count: formattedTransactions.length
    });
    
  } catch (err) {
    console.error('Error fetching loan transactions:', err);
    res.status(500).json({ error: err.message });
  }
};

// Process loan payments for payroll with manual payment amounts (UPDATED)
exports.processLoanPaymentsForPayroll = async (employee_id, payroll_month, payment_amounts = [], payment_date = null) => {
  try {
    console.log(`Processing loan payments for employee ${employee_id}, month ${payroll_month}`);
    
    // Get active loans for the employee
    const activeLoans = await query(`
      SELECT 
        el.id,
        ROUND(el.remaining_amount, 2) as remaining_amount,
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
    
    // Process payments based on provided payment_amounts array
    for (const paymentInfo of payment_amounts) {
      const loan = activeLoans.find(l => l.id === paymentInfo.loan_id);
      if (loan && !loan.already_paid_this_month) {
        const maxPayment = parseFloat(loan.remaining_amount);
        const deductionAmount = Math.min(parseFloat(paymentInfo.amount), maxPayment);
        const newRemainingAmount = Math.max(0, maxPayment - deductionAmount);
        
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
          amount_paid: parseFloat(deductionAmount.toFixed(2)),
          new_remaining_amount: parseFloat(newRemainingAmount.toFixed(2)),
          status: newRemainingAmount <= 0 ? 'completed' : 'active',
          payment_id: paymentResult.insertId
        });
        
        totalDeductions += deductionAmount;
        
        console.log(`Processed loan payment: Loan #${loan.id} - AED ${deductionAmount.toFixed(2)}, remaining: AED ${newRemainingAmount.toFixed(2)}`);
      }
    }
    
    return {
      success: true,
      total_deductions: parseFloat(totalDeductions.toFixed(2)),
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

// ✅ NEW: Get comprehensive loan overview for all employees
exports.getLoanOverview = async (req, res) => {
  try {
    console.log('🔄 Fetching comprehensive loan overview...');
    
    // Get overall loan statistics
    const overallStats = await query(`
      SELECT 
        COUNT(DISTINCT el.employee_id) as total_employees_with_loans,
        COUNT(CASE WHEN el.status = 'active' THEN 1 END) as total_active_loans,
        COUNT(CASE WHEN el.status = 'completed' THEN 1 END) as total_completed_loans,
        COALESCE(ROUND(SUM(CASE WHEN el.status = 'active' THEN el.remaining_amount ELSE 0 END), 2), 0.00) as total_outstanding_amount,
        COALESCE(ROUND(SUM(el.total_loan_amount), 2), 0.00) as total_loan_value
      FROM employee_loans el
    `);

    // Get employee-wise loan summary with recovery rates
    const employeeLoans = await query(`
      SELECT 
        e.employeeId as employee_id,
        e.name as employee_name,
        e.monthlySalary as monthly_salary,
        COUNT(el.id) as total_loans,
        COUNT(CASE WHEN el.status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN el.status = 'completed' THEN 1 END) as completed_loans,
        COALESCE(ROUND(SUM(el.total_loan_amount), 2), 0.00) as total_loan_amount,
        COALESCE(ROUND(SUM(CASE WHEN el.status = 'active' THEN el.remaining_amount ELSE 0 END), 2), 0.00) as total_remaining,
        CASE 
          WHEN SUM(el.total_loan_amount) > 0 THEN 
            ROUND(((SUM(el.total_loan_amount) - SUM(CASE WHEN el.status = 'active' THEN el.remaining_amount ELSE 0 END)) / SUM(el.total_loan_amount)) * 100, 1)
          ELSE 100.0
        END as recovery_rate,
        MAX(COALESCE(lt.created_at, el.updated_at)) as last_activity,
        CASE 
          WHEN COUNT(el.id) = 0 THEN 'no_loans'
          WHEN COUNT(CASE WHEN el.status = 'active' THEN 1 END) > 0 THEN 'active'
          WHEN COUNT(CASE WHEN el.status = 'completed' THEN 1 END) > 0 THEN 'completed'
          ELSE 'no_loans'
        END as status
      FROM employees e
      LEFT JOIN employee_loans el ON e.employeeId = el.employee_id
      LEFT JOIN loan_transactions lt ON el.id = lt.loan_id
      GROUP BY e.employeeId, e.name, e.monthlySalary
      HAVING COUNT(el.id) > 0
      ORDER BY recovery_rate ASC, total_remaining DESC, e.name ASC
    `);

    // Calculate average recovery rate
    const totalValueWithLoans = employeeLoans.reduce((sum, emp) => sum + parseFloat(emp.total_loan_amount), 0);
    const totalRecovered = employeeLoans.reduce((sum, emp) => {
      const loanAmount = parseFloat(emp.total_loan_amount);
      const remaining = parseFloat(emp.total_remaining);
      return sum + (loanAmount - remaining);
    }, 0);
    const averageRecoveryRate = totalValueWithLoans > 0 ? Math.round((totalRecovered / totalValueWithLoans) * 100 * 10) / 10 : 0;

    // Format employee data
    const formattedEmployees = employeeLoans.map(emp => ({
      ...emp,
      monthly_salary: parseFloat(emp.monthly_salary || 0),
      total_loan_amount: parseFloat(emp.total_loan_amount || 0).toFixed(2),
      total_remaining: parseFloat(emp.total_remaining || 0).toFixed(2),
      recovery_rate: parseFloat(emp.recovery_rate || 0)
    }));

    const response = {
      total_employees_with_loans: overallStats[0].total_employees_with_loans,
      total_active_loans: overallStats[0].total_active_loans,
      total_completed_loans: overallStats[0].total_completed_loans,
      total_outstanding_amount: parseFloat(overallStats[0].total_outstanding_amount || 0).toFixed(2),
      total_loan_value: parseFloat(overallStats[0].total_loan_value || 0).toFixed(2),
      average_recovery_rate: averageRecoveryRate,
      employees: formattedEmployees
    };

    console.log('✅ Loan overview fetched successfully:', {
      totalEmployees: response.total_employees_with_loans,
      activeLoans: response.total_active_loans,
      completedLoans: response.total_completed_loans,
      outstandingAmount: response.total_outstanding_amount
    });

    res.json(response);
  } catch (err) {
    console.error('❌ Error fetching loan overview:', err);
    res.status(500).json({ error: err.message });
  }
};

// ================ SKIP MONTHS MANAGEMENT ================

// Add skip month for loan deduction
exports.addSkipMonth = async (req, res) => {
  try {
    const { loan_id, skip_month, reason } = req.body;
    
    if (!loan_id || !skip_month) {
      return res.status(400).json({
        error: 'Loan ID and skip month are required'
      });
    }
    
    // Validate month format (YYYY-MM)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(skip_month)) {
      return res.status(400).json({
        error: 'Skip month must be in YYYY-MM format'
      });
    }
    
    // Get loan details and verify it exists
    const loanResult = await query(
      'SELECT employee_id FROM employee_loans WHERE id = ?',
      [loan_id]
    );
    
    if (loanResult.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    const employee_id = loanResult[0].employee_id;
    const createdBy = req.user?.username || req.user?.name || 'Admin User';
    
    // Insert skip month record
    const result = await query(`
      INSERT INTO loan_deduction_skips (
        employee_id, loan_id, skip_month, reason, created_by
      ) VALUES (?, ?, ?, ?, ?)
    `, [employee_id, loan_id, skip_month, reason || null, createdBy]);
    
    res.json({
      success: true,
      message: `Skip month ${skip_month} added for loan ID ${loan_id}`,
      skip_id: result.insertId,
      employee_id,
      loan_id: parseInt(loan_id),
      skip_month,
      reason: reason || null
    });
    
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        error: 'Skip month already exists for this loan'
      });
    }
    console.error('Error adding skip month:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get skip months for a loan
exports.getSkipMonths = async (req, res) => {
  try {
    const { loan_id } = req.params;
    
    const skipMonths = await query(`
      SELECT 
        id,
        skip_month,
        reason,
        created_by,
        created_at
      FROM loan_deduction_skips
      WHERE loan_id = ?
      ORDER BY skip_month DESC
    `, [loan_id]);
    
    res.json({
      success: true,
      loan_id: parseInt(loan_id),
      skip_months: skipMonths
    });
    
  } catch (err) {
    console.error('Error fetching skip months:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get skip months for an employee
exports.getEmployeeSkipMonths = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { month } = req.query; // Optional filter by specific month
    
    let whereClause = 'WHERE lds.employee_id = ?';
    let params = [employee_id];
    
    if (month) {
      whereClause += ' AND lds.skip_month = ?';
      params.push(month);
    }
    
    const skipMonths = await query(`
      SELECT 
        lds.id,
        lds.loan_id,
        lds.skip_month,
        lds.reason,
        lds.created_by,
        lds.created_at,
        el.total_loan_amount,
        el.remaining_amount,
        el.status as loan_status
      FROM loan_deduction_skips lds
      LEFT JOIN employee_loans el ON lds.loan_id = el.id
      ${whereClause}
      ORDER BY lds.skip_month DESC
    `, params);
    
    res.json({
      success: true,
      employee_id,
      skip_months: skipMonths.map(skip => ({
        ...skip,
        total_loan_amount: parseFloat(skip.total_loan_amount || 0).toFixed(2),
        remaining_amount: parseFloat(skip.remaining_amount || 0).toFixed(2)
      }))
    });
    
  } catch (err) {
    console.error('Error fetching employee skip months:', err);
    res.status(500).json({ error: err.message });
  }
};

// Remove skip month
exports.removeSkipMonth = async (req, res) => {
  try {
    const { skip_id } = req.params;
    
    // Get skip month details before deleting
    const skipDetails = await query(
      'SELECT employee_id, loan_id, skip_month FROM loan_deduction_skips WHERE id = ?',
      [skip_id]
    );
    
    if (skipDetails.length === 0) {
      return res.status(404).json({ error: 'Skip month record not found' });
    }
    
    const { employee_id, loan_id, skip_month } = skipDetails[0];
    
    // Delete the skip month record
    const result = await query(
      'DELETE FROM loan_deduction_skips WHERE id = ?',
      [skip_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Skip month record not found' });
    }
    
    res.json({
      success: true,
      message: `Skip month ${skip_month} removed for loan ID ${loan_id}`,
      employee_id,
      loan_id: parseInt(loan_id),
      skip_month
    });
    
  } catch (err) {
    console.error('Error removing skip month:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update skip month
exports.updateSkipMonth = async (req, res) => {
  try {
    const { skip_id } = req.params;
    const { loan_id, skip_month, reason } = req.body;
    
    // Validate required fields
    if (!loan_id || !skip_month) {
      return res.status(400).json({ error: 'Loan ID and skip month are required' });
    }

    // Validate skip_month format (YYYY-MM)
    const skipMonthRegex = /^\d{4}-\d{2}$/;
    if (!skipMonthRegex.test(skip_month)) {
      return res.status(400).json({ error: 'Skip month must be in YYYY-MM format' });
    }

    // Validate skip month is not in the past
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    if (skip_month < currentMonth) {
      return res.status(400).json({ error: 'Cannot set skip month in the past' });
    }
    
    // Get current skip month details
    const skipDetails = await query(
      'SELECT employee_id, loan_id as old_loan_id, skip_month as old_skip_month, reason as old_reason FROM loan_deduction_skips WHERE id = ?',
      [skip_id]
    );
    
    if (skipDetails.length === 0) {
      return res.status(404).json({ error: 'Skip month record not found' });
    }
    
    const { employee_id, old_loan_id, old_skip_month, old_reason } = skipDetails[0];
    const updatedBy = req.user?.username || req.user?.name || 'Admin User';
    
    // Check if loan exists and belongs to the same employee
    const loanCheck = await query(
      'SELECT id FROM employee_loans WHERE id = ? AND employee_id = ? AND status = "active"',
      [loan_id, employee_id]
    );
    
    if (loanCheck.length === 0) {
      return res.status(400).json({ error: 'Loan not found or not active for this employee' });
    }
    
    // Check for duplicate skip month (excluding current record)
    const duplicateCheck = await query(
      'SELECT id FROM loan_deduction_skips WHERE loan_id = ? AND skip_month = ? AND id != ?',
      [loan_id, skip_month, skip_id]
    );
    
    if (duplicateCheck.length > 0) {
      return res.status(400).json({ error: 'A skip month already exists for this loan and month' });
    }
    
    // Update the skip month record with all fields
    const result = await query(
      'UPDATE loan_deduction_skips SET loan_id = ?, skip_month = ?, reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [loan_id, skip_month, reason || null, skip_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Skip month record not found' });
    }
    
    res.json({
      success: true,
      message: `Skip month updated successfully`,
      employee_id,
      loan_id: parseInt(loan_id),
      skip_month,
      reason: reason || '',
      updated_by: updatedBy,
      changes: {
        loan_id: { from: parseInt(old_loan_id), to: parseInt(loan_id) },
        skip_month: { from: old_skip_month, to: skip_month },
        reason: { from: old_reason || '', to: reason || '' }
      }
    });
    
  } catch (err) {
    console.error('Error updating skip month:', err);
    res.status(500).json({ error: err.message });
  }
};

// Check if a month should be skipped for loan deduction
exports.checkSkipMonth = async (employee_id, loan_id, payroll_month) => {
  try {
    const skipCheck = await query(`
      SELECT id FROM loan_deduction_skips
      WHERE employee_id = ? AND loan_id = ? AND skip_month = ?
    `, [employee_id, loan_id, payroll_month]);
    
    return skipCheck.length > 0;
  } catch (err) {
    console.error('Error checking skip month:', err);
    return false;
  }
};
