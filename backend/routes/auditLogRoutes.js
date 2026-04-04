/**
 * Audit Log Routes
 * API endpoints for audit log management
 */
const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  getEntityHistory,
  getUserActivity,
  exportAuditLogs
} = require('../controllers/auditLogController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All audit log routes require authentication
// Most require admin access to prevent users from viewing others' activities

// Get all audit logs with filtering (Admin only)
router.get('/', requireAuth, requireAdmin, getAuditLogs);

// Export audit logs to Excel (Admin only)
router.get('/export', requireAuth, requireAdmin, exportAuditLogs);

// Get audit log statistics (Admin only)
router.get('/stats', requireAuth, requireAdmin, getAuditStats);

// Get entity history (Admin only)
router.get('/entity/:entityType/:entityId', requireAuth, requireAdmin, getEntityHistory);

// Get user activity (Admin can see all, users can see their own)
router.get('/user/:userId', requireAuth, getUserActivity);

// Get specific audit log by ID (Admin only)
router.get('/:id', requireAuth, requireAdmin, getAuditLogById);

module.exports = router;
