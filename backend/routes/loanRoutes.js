const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyToken, requireManager, requireHR } = require('../middleware/auth');

// All loan routes require authentication
router.use(verifyToken);

// -------- LOAN MANAGEMENT ROUTES --------
// Get all loans (with optional filters)
router.get('/', loanController.getAllLoans);

// Get specific loan by ID with payment history
router.get('/:id', loanController.getLoanById);

// Create new loan (Manager+ required)
router.post('/', requireManager, loanController.createLoan);

// Update loan (Manager+ required)
router.put('/:id', requireManager, loanController.updateLoan);

// Delete loan (Manager+ required)
router.delete('/:id', requireManager, loanController.deleteLoan);

// -------- EMPLOYEE-SPECIFIC ROUTES --------
// Get active loans for specific employee (for payroll calculation)
router.get('/employee/:employee_id/active', loanController.getActiveLoansForEmployee);

// Get loan summary for specific employee
router.get('/employee/:employee_id/summary', loanController.getLoanSummaryForEmployee);

// -------- PAYMENT MANAGEMENT ROUTES --------
// Record loan payment (typically called from payroll processing)
router.post('/payments', requireManager, loanController.recordLoanPayment);

module.exports = router;
