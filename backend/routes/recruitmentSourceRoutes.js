/**
 * Recruitment Source Routes - API endpoints for recruitment source master management
 * Defines all HTTP routes for recruitment source CRUD operations
 */

const express = require('express');
const recruitmentSourceController = require('../controllers/recruitmentSourceController');

const router = express.Router();

// === CRUD ROUTES ===

// Create new recruitment source
router.post('/', recruitmentSourceController.createSource);

// Get all recruitment sources with optional filtering and pagination
router.get('/', recruitmentSourceController.getAllSources);

// Get active source names for dropdown (must be before /:id route)
router.get('/names', recruitmentSourceController.getActiveSourceNames);

// Health check endpoint
router.get('/health', recruitmentSourceController.healthCheck);

// Get recruitment source by ID
router.get('/:id', recruitmentSourceController.getSourceById);

// Update recruitment source by ID
router.put('/:id', recruitmentSourceController.updateSource);

// Delete recruitment source by ID
router.delete('/:id', recruitmentSourceController.deleteSource);

module.exports = router;