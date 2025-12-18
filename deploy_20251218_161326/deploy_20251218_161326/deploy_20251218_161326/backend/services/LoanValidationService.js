/**
 * Loan Validation Service - Centralized validation rules and business logic
 * Handles validation for loan creation, updates, payments, and business rules
 * Redesigned with comprehensive validation logic and clear error messaging
 */

const { LoanConstraints, LoanStatus } = require('../models/Loan');
const { validateLoanCalculationInputs } = require('../utils/loanCalculationUtils');
const moment = require('moment');

class LoanValidationService {
  constructor(loanRepository) {
    this.loanRepository = loanRepository;
  }

  // ================ LOAN VALIDATION METHODS ================

  /**
   * Validate loan creation data
   * @param {Object} loanData - Loan data to validate
   * @param {Object} context - Request context (user, permissions, etc.)
   * @returns {Object} - Validation result
   */
  async validateLoanCreation(loanData, context = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Required fields validation
      if (!loanData.employee_id) {
        errors.push('Employee ID is required');
      }

      if (!loanData.total_amount) {
        errors.push('Total amount is required');
      }

      if (!loanData.start_date) {
        errors.push('Start date is required');
      }

      // Employee existence validation
      if (loanData.employee_id) {
        const employeeExists = await this.validateEmployeeExists(loanData.employee_id);
        if (!employeeExists) {
          errors.push('Employee not found');
        }
      }

      // Amount validations
      if (loanData.total_amount) {
        const amountValidation = this.validateLoanAmount(loanData.total_amount);
        if (!amountValidation.isValid) {
          errors.push(...amountValidation.errors);
        }
        warnings.push(...amountValidation.warnings);
      }

      // Monthly deduction validation
      if (loanData.monthly_deduction !== undefined && loanData.monthly_deduction !== null && loanData.monthly_deduction !== '') {
        const deductionValidation = this.validateMonthlyDeduction(loanData.monthly_deduction);
        if (!deductionValidation.isValid) {
          errors.push(...deductionValidation.errors);
        }
        warnings.push(...deductionValidation.warnings);
      }

      // Date validations
      if (loanData.start_date) {
        const dateValidation = this.validateStartDate(loanData.start_date);
        if (!dateValidation.isValid) {
          errors.push(...dateValidation.errors);
        }
        warnings.push(...dateValidation.warnings);
      }

      // Description length validation
      if (loanData.description && loanData.description.length > LoanConstraints.MAX_DESCRIPTION_LENGTH) {
        errors.push(`Description must be ${LoanConstraints.MAX_DESCRIPTION_LENGTH} characters or less`);
      }

      // Business rule validations
      if (loanData.employee_id && loanData.total_amount) {
        const businessValidation = await this.validateBusinessRules(loanData, context);
        if (!businessValidation.isValid) {
          errors.push(...businessValidation.errors);
        }
        warnings.push(...businessValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.filter(Boolean)
      };

    } catch (error) {
      console.error('Error in validateLoanCreation:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to internal error'],
        warnings: []
      };
    }
  }

  /**
   * Validate loan update data
   * @param {number} loanId - Loan ID
   * @param {Object} updateData - Update data to validate
   * @param {Object} context - Request context
   * @returns {Object} - Validation result
   */
  async validateLoanUpdate(loanId, updateData, context = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Check if loan exists
      const existingLoan = await this.loanRepository.getLoanById(loanId);
      if (!existingLoan) {
        errors.push('Loan not found');
        return { isValid: false, errors, warnings };
      }

      // Validate individual fields if they're being updated
      if (updateData.total_amount !== undefined) {
        const amountValidation = this.validateLoanAmount(updateData.total_amount);
        if (!amountValidation.isValid) {
          errors.push(...amountValidation.errors);
        }
        warnings.push(...amountValidation.warnings);
      }

      if (updateData.monthly_deduction !== undefined) {
        const deductionValidation = this.validateMonthlyDeduction(updateData.monthly_deduction);
        if (!deductionValidation.isValid) {
          errors.push(...deductionValidation.errors);
        }
        warnings.push(...deductionValidation.warnings);
      }

      if (updateData.start_date !== undefined) {
        const dateValidation = this.validateStartDate(updateData.start_date);
        if (!dateValidation.isValid) {
          errors.push(...dateValidation.errors);
        }
        warnings.push(...dateValidation.warnings);
      }

      if (updateData.status !== undefined) {
        const statusValidation = this.validateLoanStatus(updateData.status);
        if (!statusValidation.isValid) {
          errors.push(...statusValidation.errors);
        }
      }

      // Validate calculated totals don't go negative
      if (updateData.total_amount !== undefined || updateData.amount_added !== undefined || updateData.amount_deducted !== undefined) {
        const calculationValidation = this.validateLoanCalculations(existingLoan, updateData);
        if (!calculationValidation.isValid) {
          errors.push(...calculationValidation.errors);
        }
        warnings.push(...calculationValidation.warnings);
      }

      // Description length validation
      if (updateData.description && updateData.description.length > LoanConstraints.MAX_DESCRIPTION_LENGTH) {
        errors.push(`Description must be ${LoanConstraints.MAX_DESCRIPTION_LENGTH} characters or less`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.filter(Boolean)
      };

    } catch (error) {
      console.error('Error in validateLoanUpdate:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to internal error'],
        warnings: []
      };
    }
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   * @param {Object} context - Request context
   * @returns {Object} - Validation result
   */
  async validatePayment(paymentData, context = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Required fields
      if (!paymentData.loan_id) {
        errors.push('Loan ID is required');
      }

      if (!paymentData.amount_paid) {
        errors.push('Amount paid is required');
      }

      if (!paymentData.payroll_month) {
        errors.push('Payroll month is required');
      }

      // Validate loan exists
      if (paymentData.loan_id) {
        const loan = await this.loanRepository.getLoanById(paymentData.loan_id);
        if (!loan) {
          errors.push('Loan not found');
        } else {
          // Validate payment amount against remaining balance
          const amountPaid = parseFloat(paymentData.amount_paid || 0);
          const remainingBalance = parseFloat(loan.remaining_amount || 0);
          
          if (amountPaid <= 0) {
            errors.push('Amount paid must be a positive number');
          } else if (amountPaid > remainingBalance) {
            errors.push(`Payment amount (${amountPaid.toFixed(2)}) cannot exceed remaining balance (${remainingBalance.toFixed(2)})`);
          }

          // Check if loan is active
          if (loan.status !== LoanStatus.ACTIVE) {
            warnings.push(`Loan status is "${loan.status}" - payments are typically made for active loans only`);
          }
        }
      }

      // Validate payroll month format
      if (paymentData.payroll_month) {
        const monthValidation = this.validatePayrollMonth(paymentData.payroll_month);
        if (!monthValidation.isValid) {
          errors.push(...monthValidation.errors);
        }
      }

      // Validate payment date if provided
      if (paymentData.payment_date) {
        const dateValidation = this.validatePaymentDate(paymentData.payment_date);
        if (!dateValidation.isValid) {
          errors.push(...dateValidation.errors);
        }
        warnings.push(...dateValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.filter(Boolean)
      };

    } catch (error) {
      console.error('Error in validatePayment:', error);
      return {
        isValid: false,
        errors: ['Payment validation failed due to internal error'],
        warnings: []
      };
    }
  }

  /**
   * Validate skip month data
   * @param {Object} skipData - Skip month data to validate
   * @param {Object} context - Request context
   * @returns {Object} - Validation result
   */
  async validateSkipMonth(skipData, context = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Required fields
      if (!skipData.loan_id) {
        errors.push('Loan ID is required');
      }

      if (!skipData.skip_month) {
        errors.push('Skip month is required');
      }

      // Validate loan exists
      if (skipData.loan_id) {
        const loan = await this.loanRepository.getLoanById(skipData.loan_id);
        if (!loan) {
          errors.push('Loan not found');
        } else {
          // Check if loan is active
          if (loan.status !== LoanStatus.ACTIVE) {
            warnings.push(`Loan status is "${loan.status}" - skip months are typically set for active loans only`);
          }
        }
      }

      // Validate skip month format
      if (skipData.skip_month) {
        const monthValidation = this.validateSkipMonth(skipData.skip_month);
        if (!monthValidation.isValid) {
          errors.push(...monthValidation.errors);
        }
        warnings.push(...monthValidation.warnings);
      }

      // Validate reason length
      if (skipData.reason && skipData.reason.length > 255) {
        errors.push('Reason must be 255 characters or less');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.filter(Boolean)
      };

    } catch (error) {
      console.error('Error in validateSkipMonth:', error);
      return {
        isValid: false,
        errors: ['Skip month validation failed due to internal error'],
        warnings: []
      };
    }
  }

  // ================ INDIVIDUAL FIELD VALIDATION METHODS ================

  /**
   * Validate loan amount
   * @param {number} amount - Loan amount to validate
   * @returns {Object} - Validation result
   */
  validateLoanAmount(amount) {
    const errors = [];
    const warnings = [];

    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount)) {
      errors.push('Loan amount must be a valid number');
    } else {
      if (numericAmount <= 0) {
        errors.push('Loan amount must be positive');
      } else if (numericAmount < LoanConstraints.MIN_LOAN_AMOUNT) {
        errors.push(`Loan amount must be at least ${LoanConstraints.MIN_LOAN_AMOUNT}`);
      } else if (numericAmount > LoanConstraints.MAX_LOAN_AMOUNT) {
        errors.push(`Loan amount cannot exceed ${LoanConstraints.MAX_LOAN_AMOUNT}`);
      }

      // Warning for very large amounts
      if (numericAmount > 100000) {
        warnings.push('Loan amount is very large - please verify this is correct');
      }

      // Warning for very small amounts
      if (numericAmount < 100 && numericAmount >= LoanConstraints.MIN_LOAN_AMOUNT) {
        warnings.push('Loan amount is very small - please verify this is correct');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate monthly deduction amount
   * @param {number} deduction - Monthly deduction to validate
   * @returns {Object} - Validation result
   */
  validateMonthlyDeduction(deduction) {
    const errors = [];
    const warnings = [];

    if (deduction === null || deduction === '' || deduction === undefined) {
      return { isValid: true, errors, warnings }; // Optional field
    }

    const numericDeduction = parseFloat(deduction);

    if (isNaN(numericDeduction)) {
      errors.push('Monthly deduction must be a valid number');
    } else {
      if (numericDeduction < LoanConstraints.MIN_MONTHLY_DEDUCTION) {
        errors.push(`Monthly deduction cannot be negative`);
      } else if (numericDeduction > LoanConstraints.MAX_LOAN_AMOUNT) {
        errors.push(`Monthly deduction is unreasonably large`);
      }

      // Warning for zero deduction
      if (numericDeduction === 0) {
        warnings.push('Monthly deduction is set to zero - loan payments will need to be made manually');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate loan start date
   * @param {string} startDate - Start date to validate (YYYY-MM-DD format)
   * @returns {Object} - Validation result
   */
  validateStartDate(startDate) {
    const errors = [];
    const warnings = [];

    if (!startDate) {
      errors.push('Start date is required');
      return { isValid: false, errors, warnings };
    }

    const date = moment(startDate, 'YYYY-MM-DD', true);

    if (!date.isValid()) {
      errors.push('Start date must be in YYYY-MM-DD format');
    } else {
      const today = moment();
      const oneYearAgo = moment().subtract(1, 'year');
      const oneYearFromNow = moment().add(1, 'year');

      // Warning for dates in the past
      if (date.isBefore(today, 'day')) {
        warnings.push('Start date is in the past');
      }

      // Warning for very old dates
      if (date.isBefore(oneYearAgo)) {
        warnings.push('Start date is more than a year ago - please verify this is correct');
      }

      // Warning for dates far in the future
      if (date.isAfter(oneYearFromNow)) {
        warnings.push('Start date is more than a year in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate loan status
   * @param {string} status - Status to validate
   * @returns {Object} - Validation result
   */
  validateLoanStatus(status) {
    const errors = [];
    const warnings = [];

    const validStatuses = Object.values(LoanStatus);

    if (!validStatuses.includes(status)) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate payroll month format
   * @param {string} payrollMonth - Payroll month to validate (YYYY-MM format)
   * @returns {Object} - Validation result
   */
  validatePayrollMonth(payrollMonth) {
    const errors = [];
    const warnings = [];

    if (!LoanConstraints.PAYROLL_MONTH_REGEX.test(payrollMonth)) {
      errors.push('Payroll month must be in YYYY-MM format');
    } else {
      const [year, month] = payrollMonth.split('-');
      const date = moment(`${year}-${month}-01`);

      if (!date.isValid()) {
        errors.push('Invalid payroll month');
      } else {
        const currentMonth = moment().format('YYYY-MM');
        const sixMonthsAgo = moment().subtract(6, 'months').format('YYYY-MM');
        const threeMonthsFromNow = moment().add(3, 'months').format('YYYY-MM');

        // Warning for very old months
        if (payrollMonth < sixMonthsAgo) {
          warnings.push('Payroll month is more than 6 months ago');
        }

        // Warning for future months
        if (payrollMonth > threeMonthsFromNow) {
          warnings.push('Payroll month is more than 3 months in the future');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate payment date
   * @param {string} paymentDate - Payment date to validate (YYYY-MM-DD format)
   * @returns {Object} - Validation result
   */
  validatePaymentDate(paymentDate) {
    const errors = [];
    const warnings = [];

    const date = moment(paymentDate, 'YYYY-MM-DD', true);

    if (!date.isValid()) {
      errors.push('Payment date must be in YYYY-MM-DD format');
    } else {
      const today = moment();
      const oneMonthAgo = moment().subtract(1, 'month');
      const tomorrow = moment().add(1, 'day');

      // Warning for future dates
      if (date.isAfter(tomorrow)) {
        warnings.push('Payment date is in the future');
      }

      // Warning for very old dates
      if (date.isBefore(oneMonthAgo)) {
        warnings.push('Payment date is more than a month ago');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate skip month format and rules
   * @param {string} skipMonth - Skip month to validate (YYYY-MM format)
   * @returns {Object} - Validation result
   */
  validateSkipMonth(skipMonth) {
    const errors = [];
    const warnings = [];

    if (!LoanConstraints.SKIP_MONTH_REGEX.test(skipMonth)) {
      errors.push('Skip month must be in YYYY-MM format');
    } else {
      const currentMonth = moment().format('YYYY-MM');
      const oneMonthAgo = moment().subtract(1, 'month').format('YYYY-MM');

      // Don't allow skip months in the past
      if (skipMonth < currentMonth) {
        errors.push('Cannot set skip month in the past');
      }

      // Warning for skip months very far in the future
      const oneYearFromNow = moment().add(1, 'year').format('YYYY-MM');
      if (skipMonth > oneYearFromNow) {
        warnings.push('Skip month is more than a year in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ================ BUSINESS RULE VALIDATION METHODS ================

  /**
   * Validate business rules for loan creation/update
   * @param {Object} loanData - Loan data to validate
   * @param {Object} context - Request context
   * @returns {Object} - Validation result
   */
  async validateBusinessRules(loanData, context = {}) {
    const errors = [];
    const warnings = [];

    try {
      // Check for existing active loans (business rule: limit concurrent loans)
      if (loanData.employee_id) {
        const existingLoans = await this.loanRepository.getAllLoans({ 
          employee_id: loanData.employee_id, 
          status: LoanStatus.ACTIVE 
        });

        const activeLoansCount = existingLoans.length;
        const maxConcurrentLoans = 5; // Business rule

        if (activeLoansCount >= maxConcurrentLoans) {
          errors.push(`Employee already has ${activeLoansCount} active loans. Maximum allowed: ${maxConcurrentLoans}`);
        } else if (activeLoansCount >= 3) {
          warnings.push(`Employee has ${activeLoansCount} active loans. Consider consolidation.`);
        }

        // Calculate total outstanding amount
        const totalOutstanding = existingLoans.reduce((sum, loan) => {
          return sum + parseFloat(loan.remaining_amount || 0);
        }, 0);

        const newLoanAmount = parseFloat(loanData.total_amount || 0);
        const totalWithNewLoan = totalOutstanding + newLoanAmount;
        const maxTotalLoanAmount = 50000; // Business rule

        if (totalWithNewLoan > maxTotalLoanAmount) {
          errors.push(`Total outstanding loans would exceed maximum limit of ${maxTotalLoanAmount}`);
        } else if (totalWithNewLoan > 30000) {
          warnings.push(`Total outstanding loans will be ${totalWithNewLoan.toFixed(2)} - this is quite high`);
        }
      }

      // Validate loan amount against employee salary (if available)
      if (loanData.employee_id && loanData.total_amount) {
        const salaryValidation = await this.validateLoanAgainstSalary(loanData.employee_id, loanData.total_amount);
        if (!salaryValidation.isValid) {
          // Make this a warning rather than error for flexibility
          warnings.push(...salaryValidation.errors);
        }
        warnings.push(...salaryValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.filter(Boolean)
      };

    } catch (error) {
      console.error('Error in validateBusinessRules:', error);
      return {
        isValid: true, // Don't block loan creation due to business rule validation errors
        errors: [],
        warnings: ['Could not validate some business rules due to internal error']
      };
    }
  }

  /**
   * Validate loan calculations don't result in negative amounts
   * @param {Object} existingLoan - Existing loan data
   * @param {Object} updateData - Update data
   * @returns {Object} - Validation result
   */
  validateLoanCalculations(existingLoan, updateData) {
    const errors = [];
    const warnings = [];

    try {
      // Calculate new totals
      const newTotalAmount = updateData.total_amount !== undefined 
        ? parseFloat(updateData.total_amount) 
        : parseFloat(existingLoan.total_amount);

      const newAmountAdded = updateData.amount_added !== undefined 
        ? parseFloat(updateData.amount_added) 
        : parseFloat(existingLoan.amount_added || 0);

      const newAmountDeducted = updateData.amount_deducted !== undefined 
        ? parseFloat(updateData.amount_deducted) 
        : parseFloat(existingLoan.amount_deducted || 0);

      const newTotalLoanAmount = newTotalAmount + newAmountAdded - newAmountDeducted;

      if (newTotalLoanAmount < 0) {
        errors.push('Total loan amount cannot be negative. Please adjust the deduction amount.');
      }

      if (newAmountAdded < 0) {
        errors.push('Amount added cannot be negative');
      }

      if (newAmountDeducted < 0) {
        errors.push('Amount deducted cannot be negative');
      }

      // Warning for unusual changes
      const currentTotal = parseFloat(existingLoan.total_loan_amount || 0);
      if (Math.abs(newTotalLoanAmount - currentTotal) > currentTotal * 0.5) {
        warnings.push('This change will significantly alter the loan amount - please verify');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Error in validateLoanCalculations:', error);
      return {
        isValid: false,
        errors: ['Could not validate loan calculations'],
        warnings: []
      };
    }
  }

  // ================ HELPER VALIDATION METHODS ================

  /**
   * Check if employee exists
   * @param {string} employeeId - Employee ID to check
   * @returns {Promise<boolean>} - Whether employee exists
   */
  async validateEmployeeExists(employeeId) {
    try {
      const result = await this.loanRepository.db.query(
        'SELECT employeeId FROM employees WHERE employeeId = ?',
        [employeeId]
      );
      return result[0].length > 0;
    } catch (error) {
      console.error('Error checking employee existence:', error);
      return false;
    }
  }

  /**
   * Validate loan amount against employee salary
   * @param {string} employeeId - Employee ID
   * @param {number} loanAmount - Loan amount
   * @returns {Object} - Validation result
   */
  async validateLoanAgainstSalary(employeeId, loanAmount) {
    const errors = [];
    const warnings = [];

    try {
      const result = await this.loanRepository.db.query(
        'SELECT monthlySalary FROM employees WHERE employeeId = ?',
        [employeeId]
      );

      if (result[0].length > 0) {
        const monthlySalary = parseFloat(result[0][0].monthlySalary || 0);
        const loanAmountNum = parseFloat(loanAmount);

        if (monthlySalary > 0) {
          const salaryMultiple = loanAmountNum / monthlySalary;

          // Business rule: Loan should not exceed 12 months salary
          if (salaryMultiple > 12) {
            errors.push(`Loan amount (${loanAmountNum.toFixed(2)}) exceeds 12 months salary (${(monthlySalary * 12).toFixed(2)})`);
          } else if (salaryMultiple > 6) {
            warnings.push(`Loan amount is ${salaryMultiple.toFixed(1)} times monthly salary - this is quite high`);
          } else if (salaryMultiple > 3) {
            warnings.push(`Loan amount is ${salaryMultiple.toFixed(1)} times monthly salary`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Error validating loan against salary:', error);
      return {
        isValid: true,
        errors: [],
        warnings: ['Could not validate loan against employee salary']
      };
    }
  }

  /**
   * Create validation error object for API responses
   * @param {string} message - Error message
   * @param {Array} validationErrors - Array of validation errors
   * @param {Array} validationWarnings - Array of validation warnings
   * @returns {Error} - Validation error object
   */
  createValidationError(message, validationErrors = [], validationWarnings = []) {
    const error = new Error(message);
    error.validationErrors = validationErrors;
    error.validationWarnings = validationWarnings;
    return error;
  }
}

module.exports = LoanValidationService;
