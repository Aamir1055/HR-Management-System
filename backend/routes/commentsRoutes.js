/**
 * Comments Routes - Defines API endpoints for employee comment management
 * Handles CRUD operations for employee-specific comments and feedback
 */
const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');

// Get all comments for a specific employee
router.get('/employee/:employeeId', commentsController.getCommentsByEmployeeId);

// Add a new comment for an employee
router.post('/employee/:employeeId', commentsController.addComment);

// Update a comment
router.put('/:commentId', commentsController.updateComment);

// Delete a comment
router.delete('/:commentId', commentsController.deleteComment);

module.exports = router;
