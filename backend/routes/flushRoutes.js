/**
 * Flush Routes - Defines API endpoints for database maintenance and cleanup
 * Handles clearing data from tables for testing and database maintenance
 */
const express = require('express');
const router = express.Router();
const flushController = require('../controllers/flushController');

router.get('/tables', flushController.getTables);
// Place specific routes before parameterized routes
router.delete('/flush/all', flushController.flushAllTables);  // Specific route first
router.delete('/flush/:table', flushController.flushTable);   // Parameterized route second

module.exports = router;
