const express = require('express');
const router = express.Router();
const advanceSalaryController = require('../controllers/advanceSalaryController');
const upload = require('../middleware/upload');
const { requireAuth, addUserOffices, requireManager } = require('../middleware/auth');

// Handle file upload for advance salary data (Manager access required)
router.post('/upload', requireAuth, requireManager, addUserOffices, upload.single('file'), advanceSalaryController.upload);

// Get advance salary overview (for management dashboard)
router.get('/overview', requireAuth, addUserOffices, advanceSalaryController.getOverview);

// Filter advance salary by month-year (this needs to be before the /:employeeId route)
router.get('/filter', requireAuth, addUserOffices, advanceSalaryController.filterByMonthYear);

// Get employee advance summary and history
router.get('/employee/:employeeId/summary', requireAuth, addUserOffices, advanceSalaryController.getEmployeeSummary);
router.get('/employee/:employeeId/history', requireAuth, addUserOffices, advanceSalaryController.getEmployeeHistory);

// Delete all advance salary records for an employee (Manager access required)
router.delete('/employee/:employeeId', requireAuth, requireManager, addUserOffices, advanceSalaryController.removeAllForEmployee);

// Fetch all advance salary records
router.get('/', requireAuth, addUserOffices, advanceSalaryController.getAll);

// Fetch advance salary for a specific employee
router.get('/:employeeId', requireAuth, addUserOffices, advanceSalaryController.getByEmployee);

// CRUD operations
router.post('/', requireAuth, addUserOffices, advanceSalaryController.createOrUpdate);
router.get('/:employeeId/:monthYear', requireAuth, addUserOffices, advanceSalaryController.getOne);
router.put('/:employeeId/:monthYear', requireAuth, addUserOffices, advanceSalaryController.update);
router.delete('/:employeeId/:monthYear', requireAuth, requireManager, advanceSalaryController.remove);

module.exports = router;
