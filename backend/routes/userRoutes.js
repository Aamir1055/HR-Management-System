const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// List users with offices
router.get('/', requireAuth, getUsers);

// Create new user (Admin only)
router.post('/', requireAuth, requireAdmin, createUser);

// Update user (Admin only)
router.put('/:id', requireAuth, requireAdmin, updateUser);

// Delete user (Admin only)
router.delete('/:id', requireAuth, requireAdmin, deleteUser);

module.exports = router;
