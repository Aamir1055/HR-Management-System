/**
 * Audit Log Controller
 * Manages retrieval and filtering of audit logs
 */
const db = require('../db');

/**
 * Get audit logs with filtering and pagination
 * @route GET /api/audit-logs
 */
async function getAuditLogs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (entityType) {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }

    if (userId) {
      conditions.push('user_id = ?');
      params.push(parseInt(userId));
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    if (search) {
      conditions.push('(username LIKE ? OR entity_name LIKE ? OR description LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    const [logs] = await db.execute(
      `SELECT 
        id, user_id, username, action, entity_type, entity_id, entity_name,
        description, old_values, new_values, ip_address, user_agent, created_at
       FROM audit_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      old_values: log.old_values ? (typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values) : null,
      new_values: log.new_values ? (typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values) : null
    }));

    res.json({
      logs: parsedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

/**
 * Get audit log by ID
 * @route GET /api/audit-logs/:id
 */
async function getAuditLogById(req, res) {
  try {
    const { id } = req.params;

    const [logs] = await db.execute(
      `SELECT 
        id, user_id, username, action, entity_type, entity_id, entity_name,
        description, old_values, new_values, ip_address, user_agent, created_at
       FROM audit_logs 
       WHERE id = ?`,
      [id]
    );

    if (logs.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    const log = {
      ...logs[0],
      old_values: logs[0].old_values ? JSON.parse(logs[0].old_values) : null,
      new_values: logs[0].new_values ? JSON.parse(logs[0].new_values) : null
    };

    res.json(log);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
}

/**
 * Get audit log statistics
 * @route GET /api/audit-logs/stats
 */
async function getAuditStats(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const conditions = [];
    const params = [];

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get action counts
    const [actionStats] = await db.execute(
      `SELECT action, COUNT(*) as count 
       FROM audit_logs 
       ${whereClause}
       GROUP BY action`,
      params
    );

    // Get entity type counts
    const [entityStats] = await db.execute(
      `SELECT entity_type, COUNT(*) as count 
       FROM audit_logs 
       ${whereClause}
       GROUP BY entity_type`,
      params
    );

    // Get top users
    const [userStats] = await db.execute(
      `SELECT user_id, username, COUNT(*) as count 
       FROM audit_logs 
       ${whereClause}
       GROUP BY user_id, username
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get total count
    const [totalResult] = await db.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );

    res.json({
      total: totalResult[0].total,
      byAction: actionStats,
      byEntityType: entityStats,
      topUsers: userStats
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
}

/**
 * Get entity history (all audit logs for a specific entity)
 * @route GET /api/audit-logs/entity/:entityType/:entityId
 */
async function getEntityHistory(req, res) {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 100 } = req.query;

    const [logs] = await db.execute(
      `SELECT 
        id, user_id, username, action, entity_type, entity_id, entity_name,
        description, old_values, new_values, ip_address, user_agent, created_at
       FROM audit_logs 
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [entityType, parseInt(entityId), parseInt(limit)]
    );

    const parsedLogs = logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));

    res.json({ logs: parsedLogs });
  } catch (error) {
    console.error('Error fetching entity history:', error);
    res.status(500).json({ error: 'Failed to fetch entity history' });
  }
}

/**
 * Get user activity logs
 * @route GET /api/audit-logs/user/:userId
 */
async function getUserActivity(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?',
      [parseInt(userId)]
    );
    const total = countResult[0].total;

    // Get paginated results
    const [logs] = await db.execute(
      `SELECT 
        id, user_id, username, action, entity_type, entity_id, entity_name,
        description, old_values, new_values, ip_address, user_agent, created_at
       FROM audit_logs 
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(userId), parseInt(limit), offset]
    );

    const parsedLogs = logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));

    res.json({
      logs: parsedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  getEntityHistory,
  getUserActivity
};
