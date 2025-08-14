const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
// const { verifyToken, requireManager, requireHR } = require('../middleware/auth'); // Commented out

// All loan routes are now open (no authentication required)
// router.use(verifyToken); // Commented out

// ============================================================================
// SPECIFIC ROUTES (MUST COME FIRST TO AVOID CONFLICTS WITH GENERIC /:id)
// ============================================================================

// -------- PAYMENT MANAGEMENT ROUTES --------
// Record loan payment
router.post('/payments', loanController.recordLoanPayment);

// -------- EMPLOYEE-SPECIFIC ROUTES --------  
// Get active loans for specific employee (for payroll calculation)
router.get('/employee/:employee_id/active', loanController.getActiveLoansForEmployee);

// Get loan summary for specific employee
router.get('/employee/:employee_id/summary', loanController.getLoanSummaryForEmployee);

// Get full loan history for specific employee (for detailed history page)
router.get('/employee/:employee_id/history', loanController.getEmployeeLoanHistory);

// ✅ NEW: Get transaction history for specific employee (for transaction history tab)
router.get('/employee/:employee_id/transactions', loanController.getEmployeeTransactionHistory);

// Get loan transaction history for specific employee (add/deduct activities) - legacy route
router.get('/employee/:employee_id/transactions-legacy', loanController.getEmployeeLoanTransactions);

// -------- LOAN ADJUSTMENT ROUTES (SPECIFIC ACTIONS) --------
// Deduct amount from existing loan (PUT method - your current test)
router.put('/deduct/:id', loanController.deductAmountFromLoan);

// Add amount to existing loan (PUT method for consistency)
router.put('/add/:id', loanController.addAmountToLoan);

// Alternative deduction route (POST method)
router.post('/:id/deduct-amount', loanController.deductAmountFromLoan);

// Alternative add amount route (POST method)
router.post('/:id/add-amount', loanController.addAmountToLoan);

// Combined adjust loan amount (add or deduct in one endpoint)
router.post('/:id/adjust', loanController.adjustLoanAmount);

// ============================================================================
// GENERIC ROUTES (MUST COME LAST)
// ============================================================================

// -------- OVERVIEW AND BASIC LOAN MANAGEMENT ROUTES --------
// Get comprehensive loan overview for all employees
router.get('/overview', loanController.getLoanOverview);

// Get all loans (with optional filters like ?status=active or ?employee_id=EMP-001)
router.get('/', loanController.getAllLoans);

// Get specific loan by ID with payment history
router.get('/:id', loanController.getLoanById);

// Create new loan
router.post('/', loanController.createLoan);

// Update loan (general update for title, description, dates, etc.)
router.put('/:id', loanController.updateLoan);

// Delete loan
router.delete('/:id', loanController.deleteLoan);

module.exports = router;
