/**
 * Loan Calculation Utilities
 * Financial calculation helpers for loan operations
 * Provides reusable functions for loan computations, interest, payment scheduling
 */

const moment = require('moment');

/**
 * Calculate total loan amount using the core formula
 * Formula: total_amount + amount_added - amount_deducted
 * @param {number} totalAmount - Original loan amount
 * @param {number} amountAdded - Additional amounts added to loan
 * @param {number} amountDeducted - Amounts deducted from loan
 * @returns {number} - Total loan amount
 */
function calculateTotalLoanAmount(totalAmount, amountAdded = 0, amountDeducted = 0) {
  const total = parseFloat(totalAmount || 0);
  const added = parseFloat(amountAdded || 0);
  const deducted = parseFloat(amountDeducted || 0);
  
  return total + added - deducted;
}

/**
 * Calculate remaining amount after payments
 * Formula: total_loan_amount - total_paid
 * @param {number} totalLoanAmount - Current total loan amount
 * @param {number} totalPaid - Total amount paid so far
 * @returns {number} - Remaining amount (never negative)
 */
function calculateRemainingAmount(totalLoanAmount, totalPaid = 0) {
  const total = parseFloat(totalLoanAmount || 0);
  const paid = parseFloat(totalPaid || 0);
  
  return Math.max(0, total - paid);
}

/**
 * Calculate recovery rate (percentage of loan paid)
 * @param {number} totalLoanAmount - Total loan amount
 * @param {number} totalPaid - Amount paid so far
 * @returns {number} - Recovery rate percentage (0-100)
 */
function calculateRecoveryRate(totalLoanAmount, totalPaid = 0) {
  const total = parseFloat(totalLoanAmount || 0);
  const paid = parseFloat(totalPaid || 0);
  
  if (total <= 0) return 100;
  
  const rate = (paid / total) * 100;
  return Math.round(rate * 10) / 10; // Round to 1 decimal place
}

/**
 * Determine loan completion status based on amounts
 * @param {number} remainingAmount - Remaining loan amount
 * @param {number} totalLoanAmount - Total loan amount
 * @param {number} threshold - Completion threshold (default: 0.01)
 * @returns {object} - Status information
 */
function calculateLoanStatus(remainingAmount, totalLoanAmount, threshold = 0.01) {
  const remaining = parseFloat(remainingAmount || 0);
  const total = parseFloat(totalLoanAmount || 0);
  
  const shouldBeCompleted = remaining <= threshold || total <= threshold;
  const shouldBeActive = remaining > threshold && total > threshold;
  
  return {
    shouldBeCompleted,
    shouldBeActive,
    isFullyPaid: remaining <= threshold,
    isTotalZero: total <= threshold,
    remaining,
    total
  };
}

/**
 * Calculate monthly payment based on loan amount and duration
 * @param {number} totalAmount - Total loan amount
 * @param {number} durationMonths - Duration in months
 * @param {number} interestRate - Monthly interest rate (optional)
 * @returns {number} - Suggested monthly payment
 */
function calculateMonthlyPayment(totalAmount, durationMonths, interestRate = 0) {
  const amount = parseFloat(totalAmount || 0);
  const months = parseInt(durationMonths || 1);
  const rate = parseFloat(interestRate || 0);
  
  if (amount <= 0 || months <= 0) return 0;
  
  if (rate > 0) {
    // Calculate with compound interest
    const monthlyRate = rate / 100;
    const numerator = amount * monthlyRate * Math.pow(1 + monthlyRate, months);
    const denominator = Math.pow(1 + monthlyRate, months) - 1;
    return numerator / denominator;
  } else {
    // Simple division without interest
    return amount / months;
  }
}

/**
 * Calculate loan duration based on amount and monthly payment
 * @param {number} totalAmount - Total loan amount
 * @param {number} monthlyPayment - Monthly payment amount
 * @returns {number} - Duration in months (rounded up)
 */
function calculateLoanDuration(totalAmount, monthlyPayment) {
  const amount = parseFloat(totalAmount || 0);
  const payment = parseFloat(monthlyPayment || 0);
  
  if (amount <= 0 || payment <= 0) return 0;
  
  return Math.ceil(amount / payment);
}

/**
 * Calculate next payment date based on frequency
 * @param {string|Date} lastPaymentDate - Last payment date
 * @param {string} frequency - Payment frequency ('monthly', 'weekly', 'bi-weekly')
 * @returns {Date} - Next payment date
 */
function calculateNextPaymentDate(lastPaymentDate, frequency = 'monthly') {
  const lastDate = moment(lastPaymentDate || new Date());
  
  switch (frequency.toLowerCase()) {
    case 'weekly':
      return lastDate.add(1, 'week').toDate();
    case 'bi-weekly':
      return lastDate.add(2, 'weeks').toDate();
    case 'monthly':
    default:
      return lastDate.add(1, 'month').toDate();
  }
}

/**
 * Calculate overdue amount based on missed payments
 * @param {Date} startDate - Loan start date
 * @param {Date} currentDate - Current date
 * @param {number} monthlyPayment - Expected monthly payment
 * @param {number} totalPaid - Total amount paid
 * @returns {object} - Overdue information
 */
function calculateOverdueAmount(startDate, currentDate, monthlyPayment, totalPaid) {
  const start = moment(startDate);
  const current = moment(currentDate || new Date());
  const payment = parseFloat(monthlyPayment || 0);
  const paid = parseFloat(totalPaid || 0);
  
  if (payment <= 0) return { overdueAmount: 0, missedPayments: 0 };
  
  const monthsElapsed = current.diff(start, 'months');
  const expectedPaid = monthsElapsed * payment;
  const overdueAmount = Math.max(0, expectedPaid - paid);
  const missedPayments = Math.floor(overdueAmount / payment);
  
  return {
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    missedPayments,
    monthsElapsed,
    expectedPaid: Math.round(expectedPaid * 100) / 100
  };
}

/**
 * Generate payment schedule for a loan
 * @param {number} totalAmount - Total loan amount
 * @param {number} monthlyPayment - Monthly payment amount
 * @param {Date} startDate - Loan start date
 * @param {number} interestRate - Monthly interest rate (optional)
 * @returns {Array} - Array of payment schedule objects
 */
function generatePaymentSchedule(totalAmount, monthlyPayment, startDate, interestRate = 0) {
  const amount = parseFloat(totalAmount || 0);
  const payment = parseFloat(monthlyPayment || 0);
  const rate = parseFloat(interestRate || 0) / 100;
  let balance = amount;
  let paymentDate = moment(startDate || new Date());
  const schedule = [];
  let paymentNumber = 1;
  
  while (balance > 0.01 && paymentNumber <= 120) { // Max 120 payments (10 years)
    const interestPayment = rate > 0 ? balance * rate : 0;
    const principalPayment = Math.min(payment - interestPayment, balance);
    const totalPayment = principalPayment + interestPayment;
    
    balance -= principalPayment;
    
    schedule.push({
      payment_number: paymentNumber,
      payment_date: paymentDate.format('YYYY-MM-DD'),
      total_payment: Math.round(totalPayment * 100) / 100,
      principal_payment: Math.round(principalPayment * 100) / 100,
      interest_payment: Math.round(interestPayment * 100) / 100,
      remaining_balance: Math.round(balance * 100) / 100
    });
    
    paymentDate.add(1, 'month');
    paymentNumber++;
  }
  
  return schedule;
}

/**
 * Calculate loan summary statistics for multiple loans
 * @param {Array} loans - Array of loan objects
 * @returns {object} - Summary statistics
 */
function calculateLoanSummary(loans) {
  if (!Array.isArray(loans) || loans.length === 0) {
    return {
      total_loans: 0,
      active_loans: 0,
      completed_loans: 0,
      suspended_loans: 0,
      total_loan_amount: 0,
      total_remaining: 0,
      total_paid: 0,
      average_recovery_rate: 0
    };
  }
  
  let totalLoanAmount = 0;
  let totalRemaining = 0;
  let totalPaid = 0;
  let activeLoans = 0;
  let completedLoans = 0;
  let suspendedLoans = 0;
  
  loans.forEach(loan => {
    const loanAmount = parseFloat(loan.total_loan_amount || 0);
    const remaining = parseFloat(loan.remaining_amount || 0);
    const paid = parseFloat(loan.total_paid || 0);
    
    totalLoanAmount += loanAmount;
    totalRemaining += remaining;
    totalPaid += paid;
    
    switch (loan.status) {
      case 'active':
        activeLoans++;
        break;
      case 'completed':
        completedLoans++;
        break;
      case 'suspended':
        suspendedLoans++;
        break;
    }
  });
  
  const averageRecoveryRate = totalLoanAmount > 0 
    ? Math.round((totalPaid / totalLoanAmount) * 100 * 10) / 10
    : 0;
  
  return {
    total_loans: loans.length,
    active_loans: activeLoans,
    completed_loans: completedLoans,
    suspended_loans: suspendedLoans,
    total_loan_amount: Math.round(totalLoanAmount * 100) / 100,
    total_remaining: Math.round(totalRemaining * 100) / 100,
    total_paid: Math.round(totalPaid * 100) / 100,
    average_recovery_rate: averageRecoveryRate
  };
}

/**
 * Format monetary values consistently
 * @param {number} amount - Amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted amount
 */
function formatCurrency(amount, decimals = 2) {
  const num = parseFloat(amount || 0);
  return num.toFixed(decimals);
}

/**
 * Validate loan calculation inputs
 * @param {object} params - Parameters to validate
 * @returns {object} - Validation result
 */
function validateLoanCalculationInputs(params) {
  const errors = [];
  const warnings = [];
  
  if (params.totalAmount !== undefined) {
    const amount = parseFloat(params.totalAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Total amount must be a positive number');
    } else if (amount > 999999.99) {
      warnings.push('Total amount is very large');
    }
  }
  
  if (params.monthlyPayment !== undefined) {
    const payment = parseFloat(params.monthlyPayment);
    if (isNaN(payment) || payment < 0) {
      errors.push('Monthly payment must be a non-negative number');
    }
  }
  
  if (params.interestRate !== undefined) {
    const rate = parseFloat(params.interestRate);
    if (isNaN(rate) || rate < 0) {
      errors.push('Interest rate must be a non-negative number');
    } else if (rate > 50) {
      warnings.push('Interest rate is very high');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  calculateTotalLoanAmount,
  calculateRemainingAmount,
  calculateRecoveryRate,
  calculateLoanStatus,
  calculateMonthlyPayment,
  calculateLoanDuration,
  calculateNextPaymentDate,
  calculateOverdueAmount,
  generatePaymentSchedule,
  calculateLoanSummary,
  formatCurrency,
  validateLoanCalculationInputs
};
