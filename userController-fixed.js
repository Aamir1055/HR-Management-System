/**
 * User Controller - Provides user listing with office assignments.
 * Admin users get all offices; other users get only their assigned offices.
 */
const db = require('../db');
const bcrypt = require('bcrypt');
const { logAudit } = require('../middleware/auditMiddleware');

// Helper to safely parse request bodies when server uses express.text for JSON
function parseRequestBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      try {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        body = obj;
      } catch (_) {
        body = {};
      }
    }
  } else {
    body = JSON.parse(JSON.stringify(body || {}));
  }

  if (body.two_factor_enabled !== undefined) {
    const v = body.two_factor_enabled;
    if (typeof v === 'string') {
      body.two_factor_enabled = v === 'true' || v === '1' || v === 'on';
    } else {
      body.two_factor_enabled = !!v;
    }
  }

  if (body.office_ids && !Array.isArray(body.office_ids)) {
    try {
      const parsed = JSON.parse(body.office_ids);
      if (Array.isArray(parsed)) body.office_ids = parsed;
    } catch (_) {
      body.office_ids = String(body.office_ids)
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !Number.isNaN(n));
    }
  }

  return body;
}

async function getUsers(req, res) {
  try {
    const [userRows] = await db.execute(`
      SELECT u.id, u.username, u.role, u.two_factor_enabled, u.created_at, u.updated_at
      FROM users u
      ORDER BY u.created_at ASC
    `);

    const [officeRows] = await db.execute(`SELECT id, name, location FROM offices`);
    const officeMap = new Map(officeRows.map(o => [o.id, o]));

    const [userOfficeRows] = await db.execute(`SELECT user_id, office_id FROM user_offices`);
    const officesByUser = userOfficeRows.reduce((acc, row) => {
      if (!acc[row.user_id]) acc[row.user_id] = [];
      const office = officeMap.get(row.office_id);
      if (office) acc[row.user_id].push(office);
      return acc;
    }, {});

    const isAdmin = req.user && req.user.role === 'admin';

    const users = userRows.map(u => {
      let assigned = officesByUser[u.id] || [];
      if (isAdmin) {
        assigned = officeRows;
      }
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        two_factor_enabled: !!u.two_factor_enabled,
        created_at: u.created_at,
        updated_at: u.updated_at,
        offices: assigned
      };
    });

    res.json({ users, total: users.length });
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
}

async function createUser(req, res) {
  try {
    const { username, password, role, office_ids, two_factor_enabled } = parseRequestBody(req);

    if (!username || !password || !role) {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'Username, password, and role are required'
      });
    }

    const validRoles = ['admin', 'hr', 'floor_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        details: 'Role must be one of: admin, hr, floor_manager'
      });
    }

    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Username already exists',
        details: 'This username is already taken. Please choose a different username.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      'INSERT INTO users (username, password, role, two_factor_enabled) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, two_factor_enabled ? 1 : 0]
    );

    const userId = result.insertId;

    if (office_ids && Array.isArray(office_ids) && office_ids.length > 0) {
      const values = office_ids.map(officeId => [userId, officeId]);
      await db.query(
        'INSERT INTO user_offices (user_id, office_id) VALUES ?',
        [values]
      );
    }

    const [newUser] = await db.execute(
      'SELECT id, username, role, two_factor_enabled, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    const [offices] = await db.execute(
      'SELECT o.id, o.name, o.location FROM offices o INNER JOIN user_offices uo ON o.id = uo.office_id WHERE uo.user_id = ?',
      [userId]
    );

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'CREATE',
      entityType: 'users',
      entityId: userId,
      entityName: username,
      description: `Created new user: ${username} with role: ${role}`,
      newValues: {
        username,
        role,
        two_factor_enabled,
        office_count: office_ids?.length || 0
      },
      ipAddress,
      userAgent
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        ...newUser[0],
        two_factor_enabled: !!newUser[0].two_factor_enabled,
        offices: offices
      }
    });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message
    });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { username, password, role, office_ids, two_factor_enabled } = parseRequestBody(req);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const [users] = await db.execute('SELECT id, username, role FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = users[0];

    if (role) {
      const validRoles = ['admin', 'hr', 'floor_manager'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          details: 'Role must be one of: admin, hr, floor_manager'
        });
      }

      if (existingUser.role === 'admin' && role !== 'admin') {
        const [adminCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
        if (adminCount[0].count <= 1) {
          return res.status(403).json({
            error: 'Cannot change role',
            details: 'Cannot change the role of the last admin user'
          });
        }
      }
    }

    if (username && username !== existingUser.username) {
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          error: 'Username already exists',
          details: 'This username is already taken. Please choose a different username.'
        });
      }
    }

    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (role) {
      updates.push('role = ?');
      values.push(role);
    }

    if (two_factor_enabled !== undefined) {
      updates.push('two_factor_enabled = ?');
      values.push(two_factor_enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(userId);
      await db.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    if (office_ids !== undefined) {
      await db.execute('DELETE FROM user_offices WHERE user_id = ?', [userId]);

      if (Array.isArray(office_ids) && office_ids.length > 0) {
        const officeValues = office_ids.map(officeId => [userId, officeId]);
        await db.query(
          'INSERT INTO user_offices (user_id, office_id) VALUES ?',
          [officeValues]
        );
      }
    }

    const [updatedUser] = await db.execute(
      'SELECT id, username, role, two_factor_enabled, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    const [offices] = await db.execute(
      'SELECT o.id, o.name, o.location FROM offices o INNER JOIN user_offices uo ON o.id = uo.office_id WHERE uo.user_id = ?',
      [userId]
    );

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    const changes = [];
    if (username && username !== existingUser.username) changes.push('username');
    if (password) changes.push('password');
    if (role && role !== existingUser.role) changes.push('role');
    if (two_factor_enabled !== undefined) changes.push('two_factor_enabled');
    if (office_ids !== undefined) changes.push('office assignments');

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'UPDATE',
      entityType: 'users',
      entityId: userId,
      entityName: username || existingUser.username,
      description: `Updated user: ${existingUser.username}. Changed: ${changes.join(', ')}`,
      oldValues: {
        username: existingUser.username,
        role: existingUser.role
      },
      newValues: {
        username: username || existingUser.username,
        role: role || existingUser.role,
        two_factor_enabled,
        office_count: office_ids?.length
      },
      ipAddress,
      userAgent
    });

    res.json({
      message: 'User updated successfully',
      user: {
        ...updatedUser[0],
        two_factor_enabled: !!updatedUser[0].two_factor_enabled,
        offices: offices
      }
    });
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message
    });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const [users] = await db.execute('SELECT id, username, role FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (req.user && req.user.id === userId) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    if (user.role === 'admin') {
      const [adminCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (adminCount[0].count <= 1) {
        return res.status(403).json({ error: 'Cannot delete the last admin user' });
      }
    }

    await db.execute('DELETE FROM user_offices WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE',
      entityType: 'users',
      entityId: userId,
      entityName: user.username,
      description: `Deleted user: ${user.username} (role: ${user.role})`,
      oldValues: {
        username: user.username,
        role: user.role
      },
      ipAddress,
      userAgent
    });

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: userId,
        username: user.username
      }
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser };
