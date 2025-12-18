/**
 * Recruitment Pipeline Routes - API endpoints for recruitment pipeline master management
 * Defines all HTTP routes for recruitment pipeline CRUD operations
 */

const express = require('express');
const recruitmentPipelineController = require('../controllers/recruitmentPipelineController');

const router = express.Router();

// === CRUD ROUTES ===

// Create new recruitment pipeline
router.post('/', recruitmentPipelineController.createPipeline);

// Get all recruitment pipelines with optional filtering and pagination
router.get('/', recruitmentPipelineController.getAllPipelines);

// Get active pipeline names for dropdown (must be before /:id route)
router.get('/names', recruitmentPipelineController.getActivePipelineNames);

// Health check endpoint
router.get('/health', recruitmentPipelineController.healthCheck);

// Get recruitment pipeline by ID
router.get('/:id', recruitmentPipelineController.getPipelineById);

// Update recruitment pipeline by ID
router.put('/:id', recruitmentPipelineController.updatePipeline);

// Delete recruitment pipeline by ID
router.delete('/:id', recruitmentPipelineController.deletePipeline);

module.exports = router;