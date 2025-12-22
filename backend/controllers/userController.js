/**
 * User Controller - Provides user listing with office assignments.
 * Admin users get all offices; other users get only their assigned offices.
 */
const db = require('../db');
const bcrypt = require('bcrypt');

async function getUsers(req, res) {
  try {
    // Basic users
    const [userRows] = await db.execute(`
      SELECT u.id, u.username, u.role, u.two_factor_enabled, u.created_at, u.updated_at
      FROM users u
      ORDER BY u.created_at ASC
    `);

    // Offices map
    const [officeRows] = await db.execute(`SELECT id, name, location FROM offices`);
    const officeMap = new Map(officeRows.map(o => [o.id, o]));

    // User office assignments
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
        // Admin sees all offices for convenience in UI
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
    const { username, password, role, office_ids, two_factor_enabled } = req.body;

    // Validation
    if (!username || !password || !role) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: 'Username, password, and role are required' 
      });
    }

    // Validate role
    const validRoles = ['admin', 'hr', 'floor_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        details: 'Role must be one of: admin, hr, floor_manager' 
      });
    }

    // Check if username already exists
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.execute(
      'INSERT INTO users (username, password, role, two_factor_enabled) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, two_factor_enabled ? 1 : 0]
    );

    const userId = result.insertId;

    // Insert office assignments if provided
    if (office_ids && Array.isArray(office_ids) && office_ids.length > 0) {
      const values = office_ids.map(officeId => [userId, officeId]);
      await db.query(
        'INSERT INTO user_offices (user_id, office_id) VALUES ?',
        [values]
      );
    }

    // Fetch the created user with office details
    const [newUser] = await db.execute(
      'SELECT id, username, role, two_factor_enabled, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    // Fetch assigned offices
    const [offices] = await db.execute(
      'SELECT o.id, o.name, o.location FROM offices o INNER JOIN user_offices uo ON o.id = uo.office_id WHERE uo.user_id = ?',
      [userId]
    );

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
    const { username, password, role, office_ids, two_factor_enabled } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const [users] = await db.execute('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = users[0];

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'hr', 'floor_manager'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          error: 'Invalid role',
          details: 'Role must be one of: admin, hr, floor_manager' 
        });
      }

      // Prevent changing the last admin's role
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

    // Check if username is being changed and if it's already taken
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

    // Build update query
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

    // Update user if there are changes
    if (updates.length > 0) {
      values.push(userId);
      await db.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Update office assignments if provided
    if (office_ids !== undefined) {
      // Delete existing assignments
      await db.execute('DELETE FROM user_offices WHERE user_id = ?', [userId]);

      // Insert new assignments
      if (Array.isArray(office_ids) && office_ids.length > 0) {
        const officeValues = office_ids.map(officeId => [userId, officeId]);
        await db.query(
          'INSERT INTO user_offices (user_id, office_id) VALUES ?',
          [officeValues]
        );
      }
    }

    // Fetch updated user with office details
    const [updatedUser] = await db.execute(
      'SELECT id, username, role, two_factor_enabled, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    // Fetch assigned offices
    const [offices] = await db.execute(
      'SELECT o.id, o.name, o.location FROM offices o INNER JOIN user_offices uo ON o.id = uo.office_id WHERE uo.user_id = ?',
      [userId]
    );

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

    // Check if user exists
    const [users] = await db.execute('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent deleting yourself
    if (req.user && req.user.id === userId) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const [adminCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      if (adminCount[0].count <= 1) {
        return res.status(403).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Delete user office assignments first (foreign key constraint)
    await db.execute('DELETE FROM user_offices WHERE user_id = ?', [userId]);

    // Delete the user
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);

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
