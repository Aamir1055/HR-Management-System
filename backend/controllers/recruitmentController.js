/**
 * Recruitment Controller - HTTP layer for recruitment operations
 * Handles HTTP requests and responses for recruitment management
 */

const RecruitmentRepository = require('../repositories/RecruitmentRepository');
const RecruitmentService = require('../services/RecruitmentService');
const { RecruitmentSources, RecruitmentPipelines, CommonNationalities } = require('../models/Recruitment');

// Service instance cache
let serviceInstance = null;

/**
 * Initialize service dependencies
 * @param {Object} db - Database connection
 * @returns {Object} - Service instance
 */
function initializeService(db) {
  if (!serviceInstance) {
    const recruitmentRepository = new RecruitmentRepository(db);
    serviceInstance = new RecruitmentService(recruitmentRepository);
  }
  return serviceInstance;
}

/**
 * Handle HTTP errors consistently
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 */
function handleError(res, error, defaultMessage = 'Internal server error') {
  console.error('Recruitment Controller error:', error);
  
  // Handle validation errors
  if (error.validationErrors) {
    return res.status(400).json({
      error: error.message,
      validationErrors: error.validationErrors,
      validationWarnings: error.validationWarnings || []
    });
  }
  
  // Handle known application errors
  if (error.message.includes('not found')) {
    return res.status(404).json({ error: error.message });
  }
  
  if (error.message.includes('already registered') || error.message.includes('Email')) {
    return res.status(409).json({ error: error.message });
  }
  
  // Handle database/server errors
  res.status(500).json({
    error: defaultMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

const recruitmentController = {
  
  // === CRUD OPERATIONS ===
  
  /**
   * Create new recruitment record
   * POST /api/recruitment
   */
  async createRecruitment(req, res) {
    try {
      const service = initializeService(req.db);
      
      console.log('🔍 CREATE RECRUITMENT - Request body:', req.body);
      console.log('🔍 CREATE RECRUITMENT - File:', req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file');
      
      const recruitment = await service.createRecruitment(req.body, req.file);
      
      res.status(201).json({
        message: 'Recruitment record created successfully',
        recruitment
      });
    } catch (error) {
      handleError(res, error, 'Failed to create recruitment record');
    }
  },
  
  /**
   * Get all recruitment records with filtering and pagination
   * GET /api/recruitment
   */
  async getAllRecruitments(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Extract query parameters
      const options = {
        search: req.query.search,
        recruitmentSource: req.query.source,
        recruitmentPipeline: req.query.pipeline,
        nationality: req.query.nationality,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        orderBy: req.query.orderBy,
        orderDirection: req.query.orderDirection,
        limit: req.query.limit,
        offset: req.query.offset
      };
      
      const result = await service.getAllRecruitments(options);
      
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment records');
    }
  },
  
  /**
   * Get recruitment record by ID
   * GET /api/recruitment/:id
   */
  async getRecruitmentById(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const recruitment = await service.getRecruitmentById(parseInt(id));
      
      if (!recruitment) {
        return res.status(404).json({ error: 'Recruitment record not found' });
      }
      
      res.json(recruitment);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment record');
    }
  },
  
  /**
   * Update recruitment record
   * PUT /api/recruitment/:id
   */
  async updateRecruitment(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      console.log('🔍 UPDATE RECRUITMENT - ID:', id);
      console.log('🔍 UPDATE RECRUITMENT - Request body:', req.body);
      console.log('🔍 UPDATE RECRUITMENT - File:', req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file');
      
      const recruitment = await service.updateRecruitment(parseInt(id), req.body, req.file);
      
      if (!recruitment) {
        return res.status(404).json({ error: 'Recruitment record not found' });
      }
      
      res.json({
        message: 'Recruitment record updated successfully',
        recruitment
      });
    } catch (error) {
      handleError(res, error, 'Failed to update recruitment record');
    }
  },
  
  /**
   * Delete recruitment record
   * DELETE /api/recruitment/:id
   */
  async deleteRecruitment(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const deleted = await service.deleteRecruitment(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Recruitment record not found' });
      }
      
      res.json({ message: 'Recruitment record deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete recruitment record');
    }
  },
  
  // === ADDITIONAL OPERATIONS ===
  
  /**
   * Get recruitment statistics
   * GET /api/recruitment/statistics
   */
  async getStatistics(req, res) {
    try {
      const service = initializeService(req.db);
      
      const statistics = await service.getRecruitmentStatistics();
      
      res.json(statistics);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment statistics');
    }
  },
  
  /**
   * Search recruitment records
   * POST /api/recruitment/search
   */
  async searchRecruitments(req, res) {
    try {
      const service = initializeService(req.db);
      
      const searchCriteria = {
        query: req.body.query,
        source: req.body.source,
        pipeline: req.body.pipeline,
        nationality: req.body.nationality,
        dateFrom: req.body.dateFrom,
        dateTo: req.body.dateTo,
        orderBy: req.body.orderBy,
        orderDirection: req.body.orderDirection
      };
      
      const recruitments = await service.searchRecruitments(searchCriteria);
      
      res.json({ recruitments });
    } catch (error) {
      handleError(res, error, 'Failed to search recruitment records');
    }
  },
  
  /**
   * Get recruitment records by date range
   * GET /api/recruitment/date-range
   */
  async getRecruitmentsByDateRange(req, res) {
    try {
      const service = initializeService(req.db);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: 'Both startDate and endDate are required' 
        });
      }
      
      const recruitments = await service.getRecruitmentsByDateRange(startDate, endDate);
      
      res.json({ recruitments });
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment records by date range');
    }
  },
  
  /**
   * Download CV file
   * GET /api/recruitment/:id/cv/download
   */
  async downloadCV(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const fileInfo = await service.downloadCV(parseInt(id));
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Length', fileInfo.fileSize);
      
      res.sendFile(fileInfo.filePath);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'CV file not found' });
      }
      handleError(res, error, 'Failed to download CV');
    }
  },
  
  // === REFERENCE DATA ENDPOINTS ===
  
  /**
   * Get recruitment sources
   * GET /api/recruitment/sources
   */
  async getRecruitmentSources(req, res) {
    try {
      res.json({
        sources: RecruitmentSources.getAll()
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment sources');
    }
  },
  
  /**
   * Get recruitment pipelines
   * GET /api/recruitment/pipelines
   */
  async getRecruitmentPipelines(req, res) {
    try {
      res.json({
        pipelines: RecruitmentPipelines.getAll()
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment pipelines');
    }
  },
  
  /**
   * Get common nationalities
   * GET /api/recruitment/nationalities
   */
  async getNationalities(req, res) {
    try {
      res.json({
        nationalities: CommonNationalities
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch nationalities');
    }
  },
  
  /**
   * Get all reference data at once
   * GET /api/recruitment/reference-data
   */
  async getReferenceData(req, res) {
    try {
      res.json({
        sources: RecruitmentSources.getAll(),
        pipelines: RecruitmentPipelines.getAll(),
        nationalities: CommonNationalities
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch reference data');
    }
  },
  
  // === EXPORT OPERATIONS ===
  
  /**
   * Export recruitment records to Excel
   * GET /api/recruitment/export
   */
  async exportRecruitments(req, res) {
    try {
      const service = initializeService(req.db);
      const XLSX = require('xlsx');
      
      // Get all recruitment records
      const recruitments = await service.getAllRecruitments({});
      
      if (!recruitments.results || recruitments.results.length === 0) {
        return res.status(404).json({ error: 'No recruitment data to export' });
      }
      
      // Transform data for Excel export
      const exportData = recruitments.results.map(recruitment => ({
        'ID': recruitment.id,
        'First Name': recruitment.firstName,
        'Last Name': recruitment.lastName,
        'Email': recruitment.email,
        'Phone': recruitment.phone,
        'Nationality': recruitment.nationality,
        'Recruitment Source': recruitment.recruitmentSource,
        'Recruitment Pipeline': recruitment.recruitmentPipeline,
        'Position Applied': recruitment.positionApplied,
        'Expected Salary': recruitment.expectedSalary,
        'Experience Years': recruitment.experienceYears,
        'CV Available': recruitment.cvFilePath ? 'Yes' : 'No',
        'Notes': recruitment.notes || '',
        'Created Date': recruitment.createdAt ? new Date(recruitment.createdAt).toLocaleDateString('en-GB') : '',
        'Updated Date': recruitment.updatedAt ? new Date(recruitment.updatedAt).toLocaleDateString('en-GB') : ''
      }));
      
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better visibility
      const columnWidths = [
        { wch: 8 },  // ID
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Nationality
        { wch: 20 }, // Recruitment Source
        { wch: 20 }, // Recruitment Pipeline
        { wch: 20 }, // Position Applied
        { wch: 15 }, // Expected Salary
        { wch: 12 }, // Experience Years
        { wch: 12 }, // CV Available
        { wch: 30 }, // Notes
        { wch: 14 }, // Created Date
        { wch: 14 }  // Updated Date
      ];
      
      ws['!cols'] = columnWidths;
      
      // Add freeze panes to keep headers visible when scrolling
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      
      // Apply auto-filter to the entire data range
      if (exportData.length > 0) {
        const numCols = Object.keys(exportData[0]).length;
        const numRows = exportData.length;
        const filterRange = `A1:${XLSX.utils.encode_col(numCols - 1)}${numRows + 1}`;
        ws['!autofilter'] = { ref: filterRange };
        
        // Style the headers for better filter visibility
        for (let col = 0; col < numCols; col++) {
          const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
          if (ws[headerCell]) {
            ws[headerCell].s = {
              font: { bold: true },
              alignment: { horizontal: 'center' },
              fill: { fgColor: { rgb: 'E6E6FA' } } // Light lavender background
            };
          }
        }
      }
      
      XLSX.utils.book_append_sheet(wb, ws, 'Recruitment Records');
      
      // Generate Excel buffer
      const buffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
      });
      
      // Set response headers for file download with cache-busting
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `recruitment_records_${timestamp}.xlsx`;
      
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `"${Date.now()}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
      
      res.end(buffer);
      
      console.log(`🎉 Recruitment export completed: ${fileName}`);
    } catch (error) {
      handleError(res, error, 'Failed to export recruitment records');
    }
  },
  
  // === HEALTH CHECK ===
  
  /**
   * Health check endpoint
   * GET /api/recruitment/health
   */
  async healthCheck(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Test database connection by getting count
      const statistics = await service.getRecruitmentStatistics();
      
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        module: 'Recruitment',
        database: 'Connected',
        totalRecords: statistics.total
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        module: 'Recruitment',
        error: error.message
      });
    }
  }
};

module.exports = recruitmentController;
