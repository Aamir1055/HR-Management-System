/**
 * Upload Middleware - Handles file upload configuration using multer
 * Provides basic file upload functionality with destination folder setup
 */
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
module.exports = upload;
