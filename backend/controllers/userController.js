/**
 * User Controller - Provides user listing with office assignments.
 * Admin users get all offices; other users get only their assigned offices.
 */
const db = require('../db');

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

module.exports = { getUsers, deleteUser };
