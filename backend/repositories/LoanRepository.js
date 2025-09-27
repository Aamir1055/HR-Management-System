/**
 * Loan Repository - Database access layer for loan operations
 * Handles all database operations for loans, payments, transactions, and skip months
 * Redesigned with clean separation of concerns and proper error handling
 */

const { Loan, LoanPayment, LoanTransaction, LoanSkipMonth, LoanStatus } = require('../models/Loan');
const { formatCurrency } = require('../utils/loanCalculationUtils');

class LoanRepository {
  constructor(database) {
    this.db = database;
  }

  // ================ LOAN CRUD OPERATIONS ================

  /**
   * Get all loans with optional filtering and employee details
   * @param {Object} filters - Filter options (status, employee_id, etc.)
   * @param {Object} options - Query options (limit, offset, etc.)
   * @returns {Promise<Array>} - Array of loan objects
   */
  async getAllLoans(filters = {}, options = {}) {
    try {
      let whereConditions = [];
      let params = [];
      
      if (filters.status) {
        whereConditions.push('el.status = ?');
        params.push(filters.status);
      }
      
      if (filters.employee_id) {
        whereConditions.push('el.employee_id = ?');
        params.push(filters.employee_id);
      }
      
      if (filters.start_date_from) {
        whereConditions.push('el.start_date >= ?');
        params.push(filters.start_date_from);
      }
      
      if (filters.start_date_to) {
        whereConditions.push('el.start_date <= ?');
        params.push(filters.start_date_to);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const limitClause = options.limit ? `LIMIT ${parseInt(options.limit)}` : '';
      const offsetClause = options.offset ? `OFFSET ${parseInt(options.offset)}` : '';
      
      const results = await this.db.query(`
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
          el.approved_by,
          el.created_at,
          el.updated_at,
          -- Calculate total_paid using subquery
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
        ${limitClause} ${offsetClause}
      `, params);
      
      return results[0] || [];
    } catch (error) {
      console.error('Error in getAllLoans:', error);
      throw new Error(`Failed to fetch loans: ${error.message}`);
    }
  }

  /**
   * Get loan by ID with employee details and payment history
   * @param {number} loanId - Loan ID
   * @returns {Promise<Object|null>} - Loan object or null
   */
  async getLoanById(loanId) {
    try {
      const loanResult = await this.db.query(`
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
          ROUND(el.monthly_deduction, 2) as monthly_deduction,
          el.created_by,
          el.approved_by,
          el.created_at,
          el.updated_at,
          -- Calculate total_paid
          COALESCE((
            SELECT SUM(lp.amount_paid) 
            FROM loan_payments lp 
            WHERE lp.loan_id = el.id 
            AND lp.amount_paid > 0
          ), 0) as total_paid
        FROM employee_loans el
        LEFT JOIN employees e ON el.employee_id = e.employeeId
        WHERE el.id = ?
      `, [loanId]);
      
      if (loanResult[0].length === 0) {
        return null;
      }
      
      const loan = loanResult[0][0];
      
      // Get payment history
      const payments = await this.getLoanPayments(loanId);
      loan.payment_history = payments;
      
      return new Loan(loan);
    } catch (error) {
      console.error('Error in getLoanById:', error);
      throw new Error(`Failed to fetch loan: ${error.message}`);
    }
  }

  /**
   * Create a new loan
   * @param {Object} loanData - Loan data
   * @returns {Promise<Object>} - Created loan with ID
   */
  async createLoan(loanData) {
    try {
      const loan = new Loan(loanData);
      const dbObject = loan.toDbObject();
      
      const result = await this.db.query(`
        INSERT INTO employee_loans (
          employee_id, 
          total_amount, 
          amount_added,
          amount_deducted,
          total_loan_amount,
          description, 
          start_date, 
          end_date,
          remaining_amount,
          monthly_deduction,
          status,
          created_by,
          approved_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dbObject.employee_id,
        dbObject.total_amount,
        dbObject.amount_added,
        dbObject.amount_deducted,
        dbObject.total_loan_amount,
        dbObject.description,
        dbObject.start_date,
        dbObject.end_date,
        dbObject.remaining_amount,
        dbObject.monthly_deduction,
        dbObject.status,
        dbObject.created_by,
        dbObject.approved_by
      ]);
      
      loan.id = result[0].insertId;
      return loan;
    } catch (error) {
      console.error('Error in createLoan:', error);
      throw new Error(`Failed to create loan: ${error.message}`);
    }
  }

  /**
   * Update an existing loan
   * @param {number} loanId - Loan ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object|null>} - Updated loan or null
   */
  async updateLoan(loanId, updateData) {
    try {
      const existingLoan = await this.getLoanById(loanId);
      if (!existingLoan) {
        return null;
      }
      
      // Build dynamic update query
      const updateFields = [];
      const params = [];
      
      const allowedFields = [
        'total_amount', 'amount_added', 'amount_deducted', 'total_loan_amount',
        'remaining_amount', 'monthly_deduction', 'description', 'start_date',
        'end_date', 'status'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          params.push(updateData[field]);
        }
      });
      
      if (updateFields.length === 0) {
        return existingLoan;
      }
      
      params.push(loanId);
      
      await this.db.query(`
        UPDATE employee_loans 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, params);
      
      return await this.getLoanById(loanId);
    } catch (error) {
      console.error('Error in updateLoan:', error);
      throw new Error(`Failed to update loan: ${error.message}`);
    }
  }

  /**
   * Delete a loan
   * @param {number} loanId - Loan ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteLoan(loanId) {
    try {
      // Check if loan has payments
      const paymentCheck = await this.db.query(
        'SELECT COUNT(*) as count FROM loan_payments WHERE loan_id = ?',
        [loanId]
      );
      
      if (paymentCheck[0][0].count > 0) {
        throw new Error('Cannot delete loan with existing payments');
      }
      
      const result = await this.db.query('DELETE FROM employee_loans WHERE id = ?', [loanId]);
      return result[0].affectedRows > 0;
    } catch (error) {
      console.error('Error in deleteLoan:', error);
      throw new Error(`Failed to delete loan: ${error.message}`);
    }
  }

  // ================ LOAN PAYMENT OPERATIONS ================

  /**
   * Get payments for a specific loan
   * @param {number} loanId - Loan ID
   * @returns {Promise<Array>} - Array of payment objects
   */
  async getLoanPayments(loanId) {
    try {
      const results = await this.db.query(`
        SELECT 
          id,
          loan_id,
          employee_id,
          payment_date,
          ROUND(amount_paid, 2) as amount_paid,
          ROUND(remaining_balance, 2) as remaining_balance,
          payroll_month,
          created_at
        FROM loan_payments
        WHERE loan_id = ?
        ORDER BY payment_date DESC
      `, [loanId]);
      
      return results[0].map(payment => new LoanPayment(payment));
    } catch (error) {
      console.error('Error in getLoanPayments:', error);
      throw new Error(`Failed to fetch loan payments: ${error.message}`);
    }
  }

  /**
   * Record a loan payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Created payment
   */
  async recordPayment(paymentData) {
    try {
      const payment = new LoanPayment(paymentData);
      const dbObject = payment.toDbObject();
      
      const result = await this.db.query(`
        INSERT INTO loan_payments (
          loan_id,
          employee_id,
          payment_date,
          amount_paid,
          remaining_balance,
          payroll_month
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        dbObject.loan_id,
        dbObject.employee_id,
        dbObject.payment_date,
        dbObject.amount_paid,
        dbObject.remaining_balance,
        dbObject.payroll_month
      ]);
      
      payment.id = result[0].insertId;
      return payment;
    } catch (error) {
      console.error('Error in recordPayment:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Payment for this loan in the specified month has already been recorded');
      }
      throw new Error(`Failed to record payment: ${error.message}`);
    }
  }

  // ================ LOAN TRANSACTION OPERATIONS ================

  /**
   * Record a loan transaction (add/deduct)
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Created transaction
   */
  async recordTransaction(transactionData) {
    try {
      const transaction = new LoanTransaction(transactionData);
      const dbObject = transaction.toDbObject();
      
      const result = await this.db.query(`
        INSERT INTO loan_transactions (
          loan_id, employee_id, transaction_type, amount, reason,
          balance_before, balance_after, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dbObject.loan_id,
        dbObject.employee_id,
        dbObject.transaction_type,
        dbObject.amount,
        dbObject.reason,
        dbObject.balance_before,
        dbObject.balance_after,
        dbObject.created_by
      ]);
      
      transaction.id = result[0].insertId;
      return transaction;
    } catch (error) {
      console.error('Error in recordTransaction:', error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction history for an employee
   * @param {string} employeeId - Employee ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of transaction objects
   */
  async getEmployeeTransactions(employeeId, options = {}) {
    try {
      let whereConditions = ['lt.employee_id = ?'];
      let params = [employeeId];
      
      if (options.loan_id) {
        whereConditions.push('lt.loan_id = ?');
        params.push(options.loan_id);
      }
      
      const limit = options.limit ? parseInt(options.limit) : 50;
      params.push(limit);
      
      const results = await this.db.query(`
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
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY lt.created_at DESC
        LIMIT ?
      `, params);
      
      return results[0].map(transaction => new LoanTransaction(transaction));
    } catch (error) {
      console.error('Error in getEmployeeTransactions:', error);
      throw new Error(`Failed to fetch employee transactions: ${error.message}`);
    }
  }

  // ================ EMPLOYEE-SPECIFIC OPERATIONS ================

  /**
   * Get complete loan history for an employee
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object>} - Employee loan history with summary
   */
  async getEmployeeLoanHistory(employeeId) {
    try {
      // Get employee details
      const employeeResult = await this.db.query(
        'SELECT employeeId, name, monthlySalary FROM employees WHERE employeeId = ?',
        [employeeId]
      );
      
      if (employeeResult[0].length === 0) {
        throw new Error('Employee not found');
      }
      
      // Get all loans for this employee
      const loans = await this.getAllLoans({ employee_id: employeeId });
      
      // Get all payment history for this employee
      const paymentHistory = await this.db.query(`
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
      `, [employeeId]);
      
      // Calculate summary statistics
      const summary = this.calculateEmployeeLoanSummary(loans);
      
      return {
        employee: {
          ...employeeResult[0][0],
          employee_id: employeeResult[0][0].employeeId
        },
        summary,
        loans,
        payment_history: paymentHistory[0]
      };
    } catch (error) {
      console.error('Error in getEmployeeLoanHistory:', error);
      throw new Error(`Failed to fetch employee loan history: ${error.message}`);
    }
  }

  /**
   * Get active loans for an employee (for payroll calculation)
   * @param {string} employeeId - Employee ID
   * @param {string} payrollMonth - Payroll month (YYYY-MM)
   * @returns {Promise<Array>} - Array of active loans
   */
  async getActiveLoansForEmployee(employeeId, payrollMonth) {
    try {
      const results = await this.db.query(`
        SELECT 
          el.id,
          ROUND(el.total_loan_amount, 2) as total_loan_amount,
          ROUND(el.remaining_amount, 2) as remaining_amount,
          ROUND(el.monthly_deduction, 2) as monthly_deduction,
          el.start_date,
          el.end_date,
          CASE 
            WHEN lp.loan_id IS NOT NULL THEN TRUE
            ELSE FALSE
          END as already_paid_this_month,
          -- Check if this month should be skipped
          CASE 
            WHEN lds.loan_id IS NOT NULL THEN TRUE
            ELSE FALSE
          END as skip_this_month
        FROM employee_loans el
        LEFT JOIN loan_payments lp ON el.id = lp.loan_id AND lp.payroll_month = ?
        LEFT JOIN loan_deduction_skips lds ON el.id = lds.loan_id AND lds.skip_month = ?
        WHERE el.employee_id = ?
          AND el.status = 'active'
          AND el.remaining_amount > 0
          AND el.start_date <= LAST_DAY(STR_TO_DATE(?, '%Y-%m'))
        ORDER BY el.start_date ASC
      `, [payrollMonth, payrollMonth, employeeId, payrollMonth]);
      
      return results[0] || [];
    } catch (error) {
      console.error('Error in getActiveLoansForEmployee:', error);
      throw new Error(`Failed to fetch active loans: ${error.message}`);
    }
  }

  /**
   * Delete all loans for an employee
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteEmployeeLoans(employeeId) {
    try {
      // Check if any loans have payments
      const paymentsCheck = await this.db.query(`
        SELECT COUNT(*) as payment_count, COUNT(DISTINCT loan_id) as loans_with_payments
        FROM loan_payments lp 
        JOIN employee_loans el ON lp.loan_id = el.id
        WHERE el.employee_id = ?
      `, [employeeId]);
      
      const { payment_count, loans_with_payments } = paymentsCheck[0][0];
      
      if (payment_count > 0) {
        throw new Error(
          `Cannot delete employee loans with existing payment history. Found ${payment_count} payment records across ${loans_with_payments} loans.`
        );
      }
      
      // Get loans before deletion
      const existingLoans = await this.db.query(
        'SELECT id, total_loan_amount FROM employee_loans WHERE employee_id = ?',
        [employeeId]
      );
      
      // Delete all loans
      const deleteResult = await this.db.query(
        'DELETE FROM employee_loans WHERE employee_id = ?',
        [employeeId]
      );
      
      return {
        deleted_count: deleteResult[0].affectedRows,
        deleted_loans: existingLoans[0]
      };
    } catch (error) {
      console.error('Error in deleteEmployeeLoans:', error);
      throw error; // Re-throw to preserve the specific error message
    }
  }

  // ================ SKIP MONTH OPERATIONS ================

  /**
   * Add skip month for loan deduction
   * @param {Object} skipData - Skip month data
   * @returns {Promise<Object>} - Created skip month record
   */
  async addSkipMonth(skipData) {
    try {
      const skipMonth = new LoanSkipMonth(skipData);
      const dbObject = skipMonth.toDbObject();
      
      const result = await this.db.query(`
        INSERT INTO loan_deduction_skips (
          employee_id, loan_id, skip_month, reason, created_by
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        dbObject.employee_id,
        dbObject.loan_id,
        dbObject.skip_month,
        dbObject.reason,
        dbObject.created_by
      ]);
      
      skipMonth.id = result[0].insertId;
      return skipMonth;
    } catch (error) {
      console.error('Error in addSkipMonth:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Skip month already exists for this loan');
      }
      throw new Error(`Failed to add skip month: ${error.message}`);
    }
  }

  /**
   * Get skip months for a loan
   * @param {number} loanId - Loan ID
   * @returns {Promise<Array>} - Array of skip month objects
   */
  async getSkipMonths(loanId) {
    try {
      const results = await this.db.query(`
        SELECT 
          id,
          employee_id,
          loan_id,
          skip_month,
          reason,
          created_by,
          created_at,
          updated_at
        FROM loan_deduction_skips
        WHERE loan_id = ?
        ORDER BY skip_month DESC
      `, [loanId]);
      
      return results[0].map(skip => new LoanSkipMonth(skip));
    } catch (error) {
      console.error('Error in getSkipMonths:', error);
      throw new Error(`Failed to fetch skip months: ${error.message}`);
    }
  }

  /**
   * Remove skip month
   * @param {number} skipId - Skip month ID
   * @returns {Promise<Object|null>} - Deleted skip month details
   */
  async removeSkipMonth(skipId) {
    try {
      // Get skip month details before deleting
      const skipDetails = await this.db.query(
        'SELECT employee_id, loan_id, skip_month FROM loan_deduction_skips WHERE id = ?',
        [skipId]
      );
      
      if (skipDetails[0].length === 0) {
        return null;
      }
      
      const result = await this.db.query(
        'DELETE FROM loan_deduction_skips WHERE id = ?',
        [skipId]
      );
      
      if (result[0].affectedRows > 0) {
        return skipDetails[0][0];
      }
      
      return null;
    } catch (error) {
      console.error('Error in removeSkipMonth:', error);
      throw new Error(`Failed to remove skip month: ${error.message}`);
    }
  }

  /**
   * Check if a month should be skipped for loan deduction
   * @param {string} employeeId - Employee ID
   * @param {number} loanId - Loan ID
   * @param {string} payrollMonth - Payroll month (YYYY-MM)
   * @returns {Promise<boolean>} - Whether month should be skipped
   */
  async checkSkipMonth(employeeId, loanId, payrollMonth) {
    try {
      const skipCheck = await this.db.query(`
        SELECT id FROM loan_deduction_skips
        WHERE employee_id = ? AND loan_id = ? AND skip_month = ?
      `, [employeeId, loanId, payrollMonth]);
      
      return skipCheck[0].length > 0;
    } catch (error) {
      console.error('Error in checkSkipMonth:', error);
      return false; // Default to not skipping if error occurs
    }
  }

  // ================ OVERVIEW AND STATISTICS ================

  /**
   * Get comprehensive loan overview for all employees
   * @returns {Promise<Object>} - Loan overview with statistics
   */
  async getLoanOverview() {
    try {
      // Get overall loan statistics
      const overallStats = await this.db.query(`
        SELECT 
          COUNT(DISTINCT el.employee_id) as total_employees_with_loans,
          COUNT(CASE WHEN el.status = 'active' THEN 1 END) as total_active_loans,
          COUNT(CASE WHEN el.status = 'completed' THEN 1 END) as total_completed_loans,
          COALESCE(ROUND(SUM(CASE WHEN el.status = 'active' THEN el.remaining_amount ELSE 0 END), 2), 0.00) as total_outstanding_amount,
          COALESCE(ROUND(SUM(el.total_loan_amount), 2), 0.00) as total_loan_value
        FROM employee_loans el
      `);

      // Get employee-wise loan summary
      const employeeLoans = await this.db.query(`
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

      return {
        overall_stats: overallStats[0][0],
        employee_loans: employeeLoans[0]
      };
    } catch (error) {
      console.error('Error in getLoanOverview:', error);
      throw new Error(`Failed to fetch loan overview: ${error.message}`);
    }
  }

  // ================ HELPER METHODS ================

  /**
   * Calculate employee loan summary statistics
   * @param {Array} loans - Array of loan objects
   * @returns {Object} - Summary statistics
   */
  calculateEmployeeLoanSummary(loans) {
    const totalLoans = loans.length;
    const activeLoans = loans.filter(loan => loan.status === 'active').length;
    const completedLoans = loans.filter(loan => loan.status === 'completed').length;
    const totalLoanAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.total_loan_amount || 0), 0);
    const totalPaid = loans.reduce((sum, loan) => sum + parseFloat(loan.total_paid || 0), 0);
    const totalRemaining = loans.reduce((sum, loan) => sum + parseFloat(loan.remaining_amount || 0), 0);
    const totalOriginalAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.total_amount || 0), 0);
    const totalAmountAdded = loans.reduce((sum, loan) => sum + parseFloat(loan.amount_added || 0), 0);
    const totalAmountDeducted = loans.reduce((sum, loan) => sum + parseFloat(loan.amount_deducted || 0), 0);

    return {
      total_loans: totalLoans,
      active_loans: activeLoans,
      completed_loans: completedLoans,
      total_original_amount: formatCurrency(totalOriginalAmount),
      total_amount_added: formatCurrency(totalAmountAdded),
      total_amount_deducted: formatCurrency(totalAmountDeducted),
      total_loan_amount: formatCurrency(totalLoanAmount),
      total_paid: formatCurrency(totalPaid),
      total_remaining: formatCurrency(totalRemaining)
    };
  }

  /**
   * Update loan status based on remaining amount
   * @param {number} loanId - Loan ID
   * @returns {Promise<string>} - New status
   */
  async updateLoanStatus(loanId) {
    try {
      const loan = await this.getLoanById(loanId);
      if (!loan) {
        throw new Error('Loan not found');
      }

      const currentStatus = loan.status;
      let newStatus = currentStatus;

      if (loan.shouldBeCompleted() && currentStatus !== LoanStatus.COMPLETED) {
        newStatus = LoanStatus.COMPLETED;
        await this.updateLoan(loanId, { 
          status: newStatus, 
          remaining_amount: 0 
        });
      } else if (loan.shouldBeActive() && currentStatus === LoanStatus.COMPLETED) {
        newStatus = LoanStatus.ACTIVE;
        await this.updateLoan(loanId, { status: newStatus });
      }

      return newStatus;
    } catch (error) {
      console.error('Error in updateLoanStatus:', error);
      throw new Error(`Failed to update loan status: ${error.message}`);
    }
  }
}

module.exports = LoanRepository;
