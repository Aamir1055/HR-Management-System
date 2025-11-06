/**
 * Role Routes - API endpoints for role master management
 * Defines all HTTP routes for role CRUD operations
 */

const express = require('express');
const roleController = require('../controllers/roleController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// === CRUD ROUTES ===

// Create new role
router.post('/', requireAuth, roleController.createRole);

// Get all roles with optional filtering and pagination
router.get('/', requireAuth, roleController.getAllRoles);

// Get role names for dropdown (must be before /:id route)
router.get('/names', requireAuth, roleController.getRoleNames);

// Health check endpoint
router.get('/health', roleController.healthCheck);

// Get role by ID
router.get('/:id', requireAuth, roleController.getRoleById);

// Update role by ID
router.put('/:id', requireAuth, roleController.updateRole);

// Delete role by ID
router.delete('/:id', requireAuth, roleController.deleteRole);

module.exports = router;