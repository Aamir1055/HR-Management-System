const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// List users with offices
router.get('/', requireAuth, getUsers);

module.exports = router;
