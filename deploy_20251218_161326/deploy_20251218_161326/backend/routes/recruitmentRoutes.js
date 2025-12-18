/**
 * Recruitment Routes - API endpoints for recruitment management
 * Handles routing for recruitment operations with proper authentication and file upload
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import middleware
const { verifyToken, requireHR, requireManager } = require('../middleware/auth');

// Import controller
const recruitmentController = require('../controllers/recruitmentController');

// === MULTER CONFIGURATION FOR CV UPLOADS ===

// Configure multer for CV file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, JPEG, PNG'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 1 // Only one file allowed
  }
});

// === EXPORT ROUTES (Authentication required) ===

/**
 * Export recruitment data to Excel
 * GET /api/recruitment/export
 */
router.get('/export', verifyToken, recruitmentController.exportRecruitments);

// === HEALTH CHECK ROUTES (No authentication required) ===

/**
 * Health check for recruitment module
 * GET /api/recruitment/health
 */
router.get('/health', recruitmentController.healthCheck);

// === REFERENCE DATA ROUTES (Authentication required) ===

/**
 * Get all reference data (sources, pipelines, nationalities)
 * GET /api/recruitment/reference-data
 */
router.get('/reference-data', verifyToken, recruitmentController.getReferenceData);

/**
 * Get recruitment sources
 * GET /api/recruitment/sources
 */
router.get('/sources', verifyToken, recruitmentController.getRecruitmentSources);

/**
 * Get recruitment pipelines
 * GET /api/recruitment/pipelines
 */
router.get('/pipelines', verifyToken, recruitmentController.getRecruitmentPipelines);

/**
 * Get nationalities
 * GET /api/recruitment/nationalities
 */
router.get('/nationalities', verifyToken, recruitmentController.getNationalities);

// === STATISTICS ROUTES (HR+ required) ===

/**
 * Get recruitment statistics
 * GET /api/recruitment/statistics
 */
router.get('/statistics', verifyToken, requireHR, recruitmentController.getStatistics);

/**
 * Get recruitment records by date range
 * GET /api/recruitment/date-range
 */
router.get('/date-range', verifyToken, requireHR, recruitmentController.getRecruitmentsByDateRange);

// === SEARCH ROUTES (Authentication required) ===

/**
 * Search recruitment records
 * POST /api/recruitment/search
 */
router.post('/search', verifyToken, recruitmentController.searchRecruitments);

// === FILE DOWNLOAD ROUTES (Authentication required) ===

/**
 * Download CV file
 * GET /api/recruitment/:id/cv/download
 */
router.get('/:id/cv/download', verifyToken, recruitmentController.downloadCV);

// === CRUD ROUTES (HR+ required for create/update/delete, authenticated users can read) ===

/**
 * Get all recruitment records
 * GET /api/recruitment
 * Query parameters:
 * - search: Search term
 * - source: Filter by recruitment source
 * - pipeline: Filter by recruitment pipeline
 * - nationality: Filter by nationality
 * - dateFrom: Filter by start date
 * - dateTo: Filter by end date
 * - orderBy: Order by field (default: createdAt)
 * - orderDirection: Order direction (ASC/DESC, default: DESC)
 * - limit: Limit results
 * - offset: Offset for pagination
 */
router.get('/', verifyToken, recruitmentController.getAllRecruitments);

/**
 * Get recruitment record by ID
 * GET /api/recruitment/:id
 */
router.get('/:id', verifyToken, recruitmentController.getRecruitmentById);

/**
 * Create new recruitment record
 * POST /api/recruitment
 * Body: Recruitment data (form-data for file upload)
 * File: cv (optional)
 */
router.post('/', 
  verifyToken, 
  requireHR, 
  upload.single('cv'), 
  recruitmentController.createRecruitment
);

/**
 * Update recruitment record
 * PUT /api/recruitment/:id
 * Body: Recruitment data (form-data for file upload)
 * File: cv (optional)
 */
router.put('/:id', 
  verifyToken, 
  requireHR, 
  upload.single('cv'), 
  recruitmentController.updateRecruitment
);

/**
 * Delete recruitment record
 * DELETE /api/recruitment/:id
 */
router.delete('/:id', verifyToken, requireHR, recruitmentController.deleteRecruitment);

// === ERROR HANDLING MIDDLEWARE ===

// Handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size too large',
        details: 'Maximum file size allowed is 15MB'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        details: 'Only one file allowed'
      });
    }
    
    return res.status(400).json({
      error: 'File upload error',
      details: error.message
    });
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      details: error.message
    });
  }
  
  next(error);
});

module.exports = router;
