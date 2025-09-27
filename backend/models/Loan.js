/**
 * Loan Model - Clean data contracts and validation schema for Loan module
 * Defines the structure, validation rules, and business logic for loan entities
 * Redesigned with layered architecture for better maintainability
 */

/**
 * Loan Status Types
 */
const LoanStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  SUSPENDED: 'suspended'
};

/**
 * Transaction Types
 */
const TransactionType = {
  ADD: 'add',
  DEDUCT: 'deduct',
  PAYMENT: 'payment'
};

/**
 * Loan Model Schema
 */
class Loan {
  constructor(data = {}) {
    // Core loan fields
    this.id = data.id || null;
    this.employee_id = data.employee_id || '';
    this.total_amount = parseFloat(data.total_amount || 0);
    this.amount_added = parseFloat(data.amount_added || 0);
    this.amount_deducted = parseFloat(data.amount_deducted || 0);
    this.total_loan_amount = parseFloat(data.total_loan_amount || 0);
    this.remaining_amount = parseFloat(data.remaining_amount || 0);
    this.monthly_deduction = data.monthly_deduction ? parseFloat(data.monthly_deduction) : null;
    this.description = data.description || '';
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.status = data.status || LoanStatus.ACTIVE;
    this.created_by = data.created_by || null;
    this.approved_by = data.approved_by || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    
    // Computed fields (not stored in DB)
    this.employee_name = data.employee_name || null;
    this.total_paid = parseFloat(data.total_paid || 0);
    this.payment_count = parseInt(data.payment_count || 0);
  }

  /**
   * Calculate total loan amount based on components
   * Formula: total_amount + amount_added - amount_deducted
   */
  calculateTotalLoanAmount() {
    return this.total_amount + this.amount_added - this.amount_deducted;
  }

  /**
   * Calculate remaining amount after payments
   * Formula: total_loan_amount - total_paid
   */
  calculateRemainingAmount() {
    return Math.max(0, this.calculateTotalLoanAmount() - this.total_paid);
  }

  /**
   * Determine if loan should be marked as completed
   */
  shouldBeCompleted() {
    return this.calculateRemainingAmount() <= 0.01 || this.calculateTotalLoanAmount() <= 0.01;
  }

  /**
   * Determine if loan should be marked as active
   */
  shouldBeActive() {
    return this.calculateRemainingAmount() > 0.01 && this.calculateTotalLoanAmount() > 0.01;
  }

  /**
   * Get computed status based on remaining amount
   */
  getComputedStatus() {
    if (this.shouldBeCompleted()) {
      return LoanStatus.COMPLETED;
    }
    if (this.start_date && new Date(this.start_date) > new Date()) {
      return 'pending';
    }
    return this.status;
  }

  /**
   * Calculate recovery rate (percentage paid)
   */
  calculateRecoveryRate() {
    const totalLoan = this.calculateTotalLoanAmount();
    if (totalLoan <= 0) return 100;
    return Math.round(((totalLoan - this.calculateRemainingAmount()) / totalLoan) * 100 * 10) / 10;
  }

  /**
   * Format monetary values to 2 decimal places
   */
  formatMonetaryValues() {
    return {
      ...this,
      total_amount: this.total_amount.toFixed(2),
      amount_added: this.amount_added.toFixed(2),
      amount_deducted: this.amount_deducted.toFixed(2),
      total_loan_amount: this.calculateTotalLoanAmount().toFixed(2),
      remaining_amount: this.calculateRemainingAmount().toFixed(2),
      monthly_deduction: this.monthly_deduction ? this.monthly_deduction.toFixed(2) : null,
      total_paid: this.total_paid.toFixed(2)
    };
  }

  /**
   * Convert to plain object for database operations
   */
  toDbObject() {
    return {
      employee_id: this.employee_id,
      total_amount: this.total_amount,
      amount_added: this.amount_added,
      amount_deducted: this.amount_deducted,
      total_loan_amount: this.calculateTotalLoanAmount(),
      remaining_amount: this.calculateRemainingAmount(),
      monthly_deduction: this.monthly_deduction,
      description: this.description,
      start_date: this.start_date,
      end_date: this.end_date,
      status: this.status,
      created_by: this.created_by,
      approved_by: this.approved_by
    };
  }

  /**
   * Convert to API response format
   */
  toApiResponse() {
    const formatted = this.formatMonetaryValues();
    return {
      ...formatted,
      computed_status: this.getComputedStatus(),
      recovery_rate: this.calculateRecoveryRate()
    };
  }
}

/**
 * Loan Payment Model Schema
 */
class LoanPayment {
  constructor(data = {}) {
    this.id = data.id || null;
    this.loan_id = parseInt(data.loan_id || 0);
    this.employee_id = data.employee_id || '';
    this.payment_date = data.payment_date || null;
    this.amount_paid = parseFloat(data.amount_paid || 0);
    this.remaining_balance = parseFloat(data.remaining_balance || 0);
    this.payroll_month = data.payroll_month || '';
    this.created_at = data.created_at || null;
  }

  /**
   * Format monetary values
   */
  formatMonetaryValues() {
    return {
      ...this,
      amount_paid: this.amount_paid.toFixed(2),
      remaining_balance: this.remaining_balance.toFixed(2)
    };
  }

  /**
   * Convert to database object
   */
  toDbObject() {
    return {
      loan_id: this.loan_id,
      employee_id: this.employee_id,
      payment_date: this.payment_date,
      amount_paid: this.amount_paid,
      remaining_balance: this.remaining_balance,
      payroll_month: this.payroll_month
    };
  }
}

/**
 * Loan Transaction Model Schema
 */
class LoanTransaction {
  constructor(data = {}) {
    this.id = data.id || null;
    this.loan_id = parseInt(data.loan_id || 0);
    this.employee_id = data.employee_id || '';
    this.transaction_type = data.transaction_type || '';
    this.amount = parseFloat(data.amount || 0);
    this.reason = data.reason || '';
    this.balance_before = parseFloat(data.balance_before || 0);
    this.balance_after = parseFloat(data.balance_after || 0);
    this.created_by = data.created_by || '';
    this.created_at = data.created_at || null;
  }

  /**
   * Format monetary values
   */
  formatMonetaryValues() {
    return {
      ...this,
      amount: this.amount.toFixed(2),
      balance_before: this.balance_before.toFixed(2),
      balance_after: this.balance_after.toFixed(2)
    };
  }

  /**
   * Convert to database object
   */
  toDbObject() {
    return {
      loan_id: this.loan_id,
      employee_id: this.employee_id,
      transaction_type: this.transaction_type,
      amount: this.amount,
      reason: this.reason,
      balance_before: this.balance_before,
      balance_after: this.balance_after,
      created_by: this.created_by
    };
  }
}

/**
 * Loan Skip Month Model Schema
 */
class LoanSkipMonth {
  constructor(data = {}) {
    this.id = data.id || null;
    this.employee_id = data.employee_id || '';
    this.loan_id = parseInt(data.loan_id || 0);
    this.skip_month = data.skip_month || ''; // Format: YYYY-MM
    this.reason = data.reason || '';
    this.created_by = data.created_by || '';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Convert to database object
   */
  toDbObject() {
    return {
      employee_id: this.employee_id,
      loan_id: this.loan_id,
      skip_month: this.skip_month,
      reason: this.reason,
      created_by: this.created_by
    };
  }
}

/**
 * Field mappings for database queries
 */
const LoanFieldMappings = {
  // Database column name -> API field name
  db_to_api: {
    'id': 'id',
    'employee_id': 'employee_id',
    'total_amount': 'total_amount',
    'amount_added': 'amount_added',
    'amount_deducted': 'amount_deducted',
    'total_loan_amount': 'total_loan_amount',
    'remaining_amount': 'remaining_amount',
    'monthly_deduction': 'monthly_deduction',
    'description': 'description',
    'start_date': 'start_date',
    'end_date': 'end_date',
    'status': 'status',
    'created_by': 'created_by',
    'approved_by': 'approved_by',
    'created_at': 'created_at',
    'updated_at': 'updated_at'
  },
  
  // API field name -> Database column name
  api_to_db: {
    'id': 'id',
    'employee_id': 'employee_id',
    'total_amount': 'total_amount',
    'amount_added': 'amount_added',
    'amount_deducted': 'amount_deducted',
    'total_loan_amount': 'total_loan_amount',
    'remaining_amount': 'remaining_amount',
    'monthly_deduction': 'monthly_deduction',
    'description': 'description',
    'start_date': 'start_date',
    'end_date': 'end_date',
    'status': 'status',
    'created_by': 'created_by',
    'approved_by': 'approved_by',
    'created_at': 'created_at',
    'updated_at': 'updated_at'
  }
};

/**
 * Default values for new loans
 */
const LoanDefaults = {
  amount_added: 0.00,
  amount_deducted: 0.00,
  status: LoanStatus.ACTIVE,
  monthly_deduction: null
};

/**
 * Business rules and constraints
 */
const LoanConstraints = {
  MIN_LOAN_AMOUNT: 0.01,
  MAX_LOAN_AMOUNT: 999999.99,
  MIN_MONTHLY_DEDUCTION: 0.00,
  MAX_DESCRIPTION_LENGTH: 1000,
  PAYROLL_MONTH_REGEX: /^\d{4}-(0[1-9]|1[0-2])$/,
  SKIP_MONTH_REGEX: /^\d{4}-(0[1-9]|1[0-2])$/
};

module.exports = {
  Loan,
  LoanPayment,
  LoanTransaction,
  LoanSkipMonth,
  LoanStatus,
  TransactionType,
  LoanFieldMappings,
  LoanDefaults,
  LoanConstraints
};
