/**
 * Role Routes - API endpoints for role master management
 * Defines all HTTP routes for role CRUD operations
 */

const express = require('express');
const roleController = require('../controllers/roleController');

const router = express.Router();

// === CRUD ROUTES ===

// Create new role
router.post('/', roleController.createRole);

// Get all roles with optional filtering and pagination
router.get('/', roleController.getAllRoles);

// Get role names for dropdown (must be before /:id route)
router.get('/names', roleController.getRoleNames);

// Health check endpoint
router.get('/health', roleController.healthCheck);

// Get role by ID
router.get('/:id', roleController.getRoleById);

// Update role by ID
router.put('/:id', roleController.updateRole);

// Delete role by ID
router.delete('/:id', roleController.deleteRole);

module.exports = router;