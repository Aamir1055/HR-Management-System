/**
 * Peticash Routes - Defines API endpoints for petty cash expense management
 * Handles CRUD operations and provides statistics for petty cash expenses
 */
const express = require('express');
const router = express.Router();
const peticashController = require('../controllers/peticashController');
const { requireAuth, requireManager, requireHR } = require('../middleware/auth');

// =================== UTILITY ROUTES FIRST ===================
// Get available options for dropdowns (payment types, expense categories, companies)
router.get('/options', requireAuth, peticashController.getOptions);

// Get summary statistics
router.get('/summary', requireAuth, peticashController.getPeticashSummary);

// =================== MAIN PETICASH ROUTES ====================
// Get all petty cash expenses with filtering and pagination
router.get('/', requireAuth, peticashController.getAllPeticash);

// =================== CRUD OPERATIONS ========================
// Create new petty cash expense (HR+ required for creation)
router.post('/', requireAuth, requireHR, peticashController.createPeticash);

// Get petty cash expense by ID
router.get('/:id', requireAuth, peticashController.getPeticashById);

// Update existing petty cash expense (HR+ required for updates)
router.put('/:id', requireAuth, requireHR, peticashController.updatePeticash);

// Delete petty cash expense (Manager+ required for deletion)
router.delete('/:id', requireAuth, requireManager, peticashController.deletePeticash);

module.exports = router;
