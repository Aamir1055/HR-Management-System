/**
 * Audit Logging Middleware
 * Captures and logs all user activities in the system
 */
const db = require('../db');

/**
 * Log an audit entry
 * @param {Object} params - Audit log parameters
 * @param {number} params.userId - ID of the user performing the action
 * @param {string} params.username - Username of the user
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
 * @param {string} params.entityType - Type of entity affected (employees, users, positions, etc.)
 * @param {number} params.entityId - ID of the affected entity
 * @param {string} params.entityName - Name/identifier of the affected entity
 * @param {string} params.description - Detailed description
 * @param {Object} params.oldValues - Previous values (for UPDATE)
 * @param {Object} params.newValues - New values (for CREATE/UPDATE)
 * @param {string} params.ipAddress - IP address of the client
 * @param {string} params.userAgent - User agent string
 */
async function logAudit({
  userId,
  username,
  action,
  entityType,
  entityId = null,
  entityName = null,
  description = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    await db.execute(
      `INSERT INTO audit_logs 
       (user_id, username, action, entity_type, entity_id, entity_name, description, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        action,
        entityType,
        entityId,
        entityName,
        description,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    // Don't throw error to prevent breaking the main operation
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Express middleware to capture request details for audit logging
 */
function auditMiddleware(req, res, next) {
  // Attach audit helper to request object
  req.audit = {
    log: async (params) => {
      const user = req.user || {};
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      await logAudit({
        userId: user.id || params.userId,
        username: user.username || params.username,
        ipAddress,
        userAgent,
        ...params
      });
    }
  };

  next();
}

/**
 * Audit logging wrapper for route handlers
 * @param {Function} handler - Route handler function
 * @param {Object} auditConfig - Audit configuration
 */
function withAudit(handler, auditConfig) {
  return async (req, res, next) => {
    try {
      // Execute the original handler
      const result = await handler(req, res, next);

      // Log audit entry if configured
      if (auditConfig && req.user) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');

        await logAudit({
          userId: req.user.id,
          username: req.user.username,
          ipAddress,
          userAgent,
          ...auditConfig(req, res)
        });
      }

      return result;
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  logAudit,
  auditMiddleware,
  withAudit
};
