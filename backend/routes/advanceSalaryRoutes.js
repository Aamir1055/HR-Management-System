const express = require('express');
const router = express.Router();
const advanceSalaryController = require('../controllers/advanceSalaryController');
const upload = require('../middleware/upload');
const { requireAuth, addUserOffices, requireManager } = require('../middleware/auth');

// Handle file upload for advance salary data (Manager access required)
router.post('/upload', requireAuth, requireManager, addUserOffices, upload.single('file'), advanceSalaryController.upload);

// Fetch all advance salary records
router.get('/', requireAuth, addUserOffices, advanceSalaryController.getAll);

// Filter advance salary by month-year (this needs to be before the /:employeeId route)
router.get('/filter', requireAuth, addUserOffices, advanceSalaryController.filterByMonthYear);

// Fetch advance salary for a specific employee
router.get('/:employeeId', requireAuth, addUserOffices, advanceSalaryController.getByEmployee);

// CRUD operations
router.post('/', requireAuth, addUserOffices, advanceSalaryController.createOrUpdate);
router.get('/:employeeId/:monthYear', requireAuth, addUserOffices, advanceSalaryController.getOne);
router.put('/:employeeId/:monthYear', requireAuth, addUserOffices, advanceSalaryController.update);
router.delete('/:employeeId/:monthYear', requireAuth, requireManager, advanceSalaryController.remove);

module.exports = router;
