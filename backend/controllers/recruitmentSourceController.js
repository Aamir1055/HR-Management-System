/**
 * Recruitment Source Controller - HTTP layer for recruitment source master operations
 * Handles HTTP requests and responses for recruitment source management
 */

const RecruitmentSourceRepository = require('../repositories/RecruitmentSourceRepository');
const RecruitmentSourceService = require('../services/RecruitmentSourceService');

// Service instance cache
let serviceInstance = null;

/**
 * Initialize service dependencies
 * @param {Object} db - Database connection
 * @returns {Object} - Service instance
 */
function initializeService(db) {
  if (!serviceInstance) {
    const sourceRepository = new RecruitmentSourceRepository(db);
    serviceInstance = new RecruitmentSourceService(sourceRepository);
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
  console.error('Recruitment Source Controller error:', error);
  
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
  
  if (error.message.includes('already exists')) {
    return res.status(409).json({ error: error.message });
  }
  
  // Handle database/server errors
  res.status(500).json({
    error: defaultMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

const recruitmentSourceController = {
  
  // === CRUD OPERATIONS ===
  
  /**
   * Create new recruitment source record
   * POST /api/recruitment-sources
   */
  async createSource(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Handle null prototype objects from body-parser
      const bodyData = JSON.parse(JSON.stringify(req.body));
      console.log('🔍 CREATE SOURCE - Request body:', bodyData);
      
      const source = await service.createSource(bodyData);
      
      res.status(201).json({
        message: 'Recruitment source created successfully',
        source
      });
    } catch (error) {
      handleError(res, error, 'Failed to create recruitment source');
    }
  },
  
  /**
   * Get all recruitment source records with filtering and pagination
   * GET /api/recruitment-sources
   */
  async getAllSources(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Extract query parameters
      const options = {
        search: req.query.search,
        isActive: req.query.isActive,
        orderBy: req.query.orderBy,
        orderDirection: req.query.orderDirection,
        limit: req.query.limit,
        offset: req.query.offset
      };
      
      const result = await service.getAllSources(options);
      
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment sources');
    }
  },
  
  /**
   * Get recruitment source record by ID
   * GET /api/recruitment-sources/:id
   */
  async getSourceById(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const source = await service.getSourceById(parseInt(id));
      
      if (!source) {
        return res.status(404).json({ error: 'Recruitment source not found' });
      }
      
      res.json(source);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment source');
    }
  },
  
  /**
   * Update recruitment source record
   * PUT /api/recruitment-sources/:id
   */
  async updateSource(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      // Handle null prototype objects from body-parser
      const bodyData = JSON.parse(JSON.stringify(req.body));
      console.log('🔍 UPDATE SOURCE - ID:', id);
      console.log('🔍 UPDATE SOURCE - Request body:', bodyData);
      
      const source = await service.updateSource(parseInt(id), bodyData);
      
      if (!source) {
        return res.status(404).json({ error: 'Recruitment source not found' });
      }
      
      res.json({
        message: 'Recruitment source updated successfully',
        source
      });
    } catch (error) {
      handleError(res, error, 'Failed to update recruitment source');
    }
  },
  
  /**
   * Delete recruitment source record
   * DELETE /api/recruitment-sources/:id
   */
  async deleteSource(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const deleted = await service.deleteSource(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Recruitment source not found' });
      }
      
      res.json({ message: 'Recruitment source deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete recruitment source');
    }
  },
  
  // === ADDITIONAL OPERATIONS ===
  
  /**
   * Get active source names for dropdown
   * GET /api/recruitment-sources/names
   */
  async getActiveSourceNames(req, res) {
    try {
      const service = initializeService(req.db);
      
      const sourceNames = await service.getActiveSourceNames();
      
      res.json({
        sourceNames: sourceNames
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment source names');
    }
  },
  
  // === HEALTH CHECK ===
  
  /**
   * Health check endpoint
   * GET /api/recruitment-sources/health
   */
  async healthCheck(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Test database connection by getting count
      const result = await service.getAllSources({ limit: 1 });
      
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        module: 'RecruitmentSource',
        database: 'Connected',
        totalRecords: result.pagination.total
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        module: 'RecruitmentSource',
        error: error.message
      });
    }
  }
};

module.exports = recruitmentSourceController;