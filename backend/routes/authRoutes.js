/**
 * Authentication Routes - Defines API endpoints for user authentication and 2FA
 * Handles login, registration, profile management, and two-factor authentication
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.get('/login', (req, res) => {
  res.status(405).json({ 
    error: 'Method Not Allowed', 
    message: 'Login endpoint only accepts POST requests',
    hint: 'Please submit credentials via POST request with username and password'
  });
});
router.post('/login', authController.login);
router.post('/complete-first-login-2fa', authController.completeFirstLogin2FA);

// Protected routes (require authentication)
router.get('/profile', verifyToken, authController.getProfile);

// 2FA routes
router.get('/2fa/setup', verifyToken, authController.generate2FASetup);
router.post('/2fa/verify', verifyToken, authController.verify2FASetup);
router.post('/2fa/disable', verifyToken, authController.disable2FA);

// Admin only routes
router.post('/register', requireAdmin, authController.register);

module.exports = router;