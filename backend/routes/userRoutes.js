const express = require('express');
const router = express.Router();
const { getUsers, deleteUser } = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// List users with offices
router.get('/', requireAuth, getUsers);

// Delete user (Admin only)
router.delete('/:id', requireAuth, requireAdmin, deleteUser);

module.exports = router;
