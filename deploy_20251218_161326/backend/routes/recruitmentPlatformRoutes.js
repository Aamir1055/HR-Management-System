/**
 * Recruitment Platform Routes - API endpoints for recruitment platform master management
 * Defines all HTTP routes for recruitment platform CRUD operations
 */

const express = require('express');
const recruitmentPlatformController = require('../controllers/recruitmentPlatformController');

const router = express.Router();

// === CRUD ROUTES ===

// Create new recruitment platform
router.post('/', recruitmentPlatformController.createPlatform);

// Get all recruitment platforms with optional filtering and pagination
router.get('/', recruitmentPlatformController.getAllPlatforms);

// Get active platform names for dropdown (must be before /:id route)
router.get('/names', recruitmentPlatformController.getActivePlatformNames);

// Health check endpoint
router.get('/health', recruitmentPlatformController.healthCheck);

// Get recruitment platform by ID
router.get('/:id', recruitmentPlatformController.getPlatformById);

// Update recruitment platform by ID
router.put('/:id', recruitmentPlatformController.updatePlatform);

// Delete recruitment platform by ID
router.delete('/:id', recruitmentPlatformController.deletePlatform);

module.exports = router;