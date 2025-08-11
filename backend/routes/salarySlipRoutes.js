const express = require('express');
const router = express.Router();
const { verifyToken, requireManager } = require('../middleware/auth');
const {
  generateSalarySlipData,
  generateSalarySlipPDF,
  getEmployeesWithSalarySlips,
  getAvailablePeriods,
  generateAllSimplifiedSalarySlips
} = require('../controllers/salarySlipController');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get available periods (months/years) for salary slips
// GET /api/salary-slips/periods
router.get('/periods', getAvailablePeriods);

// Get list of employees with salary slips (optionally filtered by month/year)
// GET /api/salary-slips/employees?month=7&year=2025
router.get('/employees', getEmployeesWithSalarySlips);

// Generate salary slip data for a specific employee and month (frontend format)
// GET /api/salary-slips/generate/:employeeId?year=2024&month=7
router.get('/generate/:employeeId', (req, res) => {
  req.params.month = req.query.month;
  req.params.year = req.query.year;
  generateSalarySlipData(req, res);
});

// Generate simplified salary slips for all employees
// GET /api/salary-slips/simplified/generate-all?year=2024&month=7
router.get('/simplified/generate-all', generateAllSimplifiedSalarySlips);

// Legacy endpoints (keep for backward compatibility)
// GET /api/salary-slips/:employeeId/:month/:year (month comes before year in the URL)
router.get('/:employeeId/:month/:year', generateSalarySlipData);

// Generate and download salary slip PDF for a specific employee and month
// GET /api/salary-slips/:employeeId/:month/:year/pdf
router.get('/:employeeId/:month/:year/pdf', generateSalarySlipPDF);

module.exports = router;
