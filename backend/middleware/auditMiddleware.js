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
    const toNullIfUndefined = (v) => (v === undefined ? null : v);

    let oldJson = null;
    let newJson = null;
    try {
      oldJson = oldValues ? JSON.stringify(oldValues) : null;
    } catch (_) {
      oldJson = null;
    }
    try {
      newJson = newValues ? JSON.stringify(newValues) : null;
    } catch (_) {
      newJson = null;
    }

    const params = [
      toNullIfUndefined(userId),
      toNullIfUndefined(username),
      toNullIfUndefined(action),
      toNullIfUndefined(entityType),
      toNullIfUndefined(entityId),
      toNullIfUndefined(entityName),
      toNullIfUndefined(description),
      oldJson,
      newJson,
      toNullIfUndefined(ipAddress),
      toNullIfUndefined(userAgent)
    ];

    await db.execute(
      `INSERT INTO audit_logs 
       (user_id, username, action, entity_type, entity_id, entity_name, description, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );
  } catch (error) {
    // Don't throw error to prevent breaking the main operation
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Get client IP address from request
 * Handles proxied requests and cleans up IPv6-mapped IPv4 addresses
 */
function getClientIp(req) {
  // Check X-Forwarded-For header first (for proxied requests)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) {
      return cleanIpAddress(ips[0]);
    }
  }

  // Check X-Real-IP header (nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return cleanIpAddress(realIp);
  }

  // Fallback to connection remote address
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  return cleanIpAddress(ip);
}

/**
 * Clean up IP address (remove IPv6 prefix, handle localhost)
 */
function cleanIpAddress(ip) {
  if (!ip) return null;
  
  // Remove IPv6 prefix for IPv4-mapped addresses
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Clean up IPv6 localhost
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  
  return ip;
}

/**
 * Express middleware to capture request details for audit logging
 */
function auditMiddleware(req, res, next) {
  // Attach audit helper to request object
  req.audit = {
    log: async (params) => {
      const user = req.user || {};
      const ipAddress = getClientIp(req);
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
