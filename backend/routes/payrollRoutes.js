const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { requireAuth, addUserOffices, requireManager } = require('../middleware/auth');

// Existing payroll routes
router.get('/reports', requireAuth, addUserOffices, payrollController.getPayrollReports);
router.get('/employee/:employeeId', requireAuth, addUserOffices, payrollController.getEmployeePayrollDetails);
router.get('/offices', requireAuth, addUserOffices, payrollController.getOfficesForFilter);
router.get('/positions', requireAuth, payrollController.getPositionsForFilter);
router.post('/generate', requireAuth, addUserOffices, payrollController.generatePayrollForDateRange);
router.get('/attendance-days', requireAuth, addUserOffices, payrollController.getAttendanceDaysInMonth);
router.get('/attendance/pending-days', requireAuth, addUserOffices, payrollController.getEmployeePendingAttendanceDays);

// DELETE ROUTES - Attendance data deletion (Admin only)
router.delete('/attendance/month', requireAuth, requireManager, payrollController.deleteAttendanceByMonth);
router.delete('/attendance/employee-month', requireAuth, requireManager, payrollController.deleteAttendanceByEmployeeMonth);

// NEW: Half-Day Feature Routes
// Get all active half-day shifts
router.get('/half-day-shifts', requireAuth, payrollController.getHalfDayShiftsAPI);

// Check if employee is eligible for half-day shifts
router.get('/employee/:employeeId/half-day-eligibility', requireAuth, addUserOffices, payrollController.checkEmployeeHalfDayEligibility);

// Get half-day feature status
router.get('/half-day-feature-status', requireAuth, payrollController.getHalfDayFeatureStatus);

// ADMIN ROUTES - Half-day shift management (Manager only)
router.post('/half-day-shifts', requireAuth, requireManager, payrollController.createHalfDayShift);
router.put('/half-day-shifts/:shiftId', requireAuth, requireManager, payrollController.updateHalfDayShift);
router.delete('/half-day-shifts/:shiftId', requireAuth, requireManager, payrollController.deleteHalfDayShift);

// ADMIN ROUTES - Employee half-day eligibility management (Manager only)
router.put('/employee/:employeeId/half-day-eligibility', requireAuth, requireManager, payrollController.updateEmployeeHalfDayEligibility);

module.exports = router;
