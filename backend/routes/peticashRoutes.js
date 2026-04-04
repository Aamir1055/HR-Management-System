/**
 * Peticash Routes - Defines API endpoints for petty cash expense management
 * Handles CRUD operations and provides statistics for petty cash expenses
 */
const express = require('express');
const router = express.Router();
const peticashController = require('../controllers/peticashController');
const { requireAuth, requireManager, requireHR } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// =================== UTILITY ROUTES FIRST ===================
// Get available options for dropdowns (payment types, expense categories, companies)
router.get('/options', requireAuth, peticashController.getOptions);

// Get summary statistics
router.get('/summary', requireAuth, peticashController.getPeticashSummary);

// =================== IMPORT/EXPORT ROUTES ====================
router.get('/export', requireAuth, peticashController.exportPeticash);
router.post('/import', requireAuth, requireHR, upload.single('file'), peticashController.importPeticash);

// =================== MAIN PETICASH ROUTES ====================
// Get all petty cash expenses with filtering and pagination
router.get('/', requireAuth, peticashController.getAllPeticash);

// =================== CRUD OPERATIONS ========================
// Create new petty cash expense (HR+ required for creation)
router.post('/', requireAuth, requireHR, peticashController.createPeticash);

// Get petty cash expense by ID
router.get('/:id', requireAuth, peticashController.getPeticashById);

// Update existing petty cash expense (HR+ required for updates)
router.put('/:id', requireAuth, requireHR, peticashController.updatePeticash);

// Delete petty cash expense (Manager+ required for deletion)
router.delete('/:id', requireAuth, requireManager, peticashController.deletePeticash);

// =================== ERROR HANDLING MIDDLEWARE =====================
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

module.exports = router;
