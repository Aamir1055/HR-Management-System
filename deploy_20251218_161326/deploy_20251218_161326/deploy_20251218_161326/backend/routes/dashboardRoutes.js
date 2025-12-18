/**
 * Dashboard Routes - Defines API endpoints for dashboard data and celebrations
 * Handles birthday and work anniversary tracking endpoints
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// Get today's celebrations and upcoming birthdays/anniversaries
router.get('/celebrations', requireAuth, dashboardController.getCelebrations);

module.exports = router;
