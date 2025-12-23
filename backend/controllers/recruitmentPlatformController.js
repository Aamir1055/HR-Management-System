/**
 * Recruitment Platform Controller - HTTP layer for recruitment platform master operations
 * Handles HTTP requests and responses for recruitment platform management
 */

const RecruitmentPlatformRepository = require('../repositories/RecruitmentPlatformRepository');
const RecruitmentPlatformService = require('../services/RecruitmentPlatformService');

// Service instance cache
let serviceInstance = null;

/**
 * Initialize service dependencies
 * @param {Object} db - Database connection
 * @returns {Object} - Service instance
 */
function initializeService(db) {
  if (!serviceInstance) {
    const platformRepository = new RecruitmentPlatformRepository(db);
    serviceInstance = new RecruitmentPlatformService(platformRepository);
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
  console.error('Recruitment Platform Controller error:', error);
  
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

const recruitmentPlatformController = {
  
  // === CRUD OPERATIONS ===
  
  /**
   * Create new recruitment platform record
   * POST /api/recruitment-platforms
   */
  async createPlatform(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Handle null prototype objects from body-parser
      const bodyData = JSON.parse(JSON.stringify(req.body));
      console.log('🔍 CREATE PLATFORM - Request body:', bodyData);
      
      const platform = await service.createPlatform(bodyData);
      
      res.status(201).json({
        message: 'Recruitment platform created successfully',
        platform
      });
    } catch (error) {
      handleError(res, error, 'Failed to create recruitment platform');
    }
  },
  
  /**
   * Get all recruitment platform records with filtering and pagination
   * GET /api/recruitment-platforms
   */
  async getAllPlatforms(req, res) {
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
      
      const result = await service.getAllPlatforms(options);
      
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment platforms');
    }
  },
  
  /**
   * Get recruitment platform record by ID
   * GET /api/recruitment-platforms/:id
   */
  async getPlatformById(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const platform = await service.getPlatformById(parseInt(id));
      
      if (!platform) {
        return res.status(404).json({ error: 'Recruitment platform not found' });
      }
      
      res.json(platform);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment platform');
    }
  },
  
  /**
   * Update recruitment platform record
   * PUT /api/recruitment-platforms/:id
   */
  async updatePlatform(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      // Handle null prototype objects from body-parser
      const bodyData = JSON.parse(JSON.stringify(req.body));
      console.log('🔍 UPDATE PLATFORM - ID:', id);
      console.log('🔍 UPDATE PLATFORM - Request body:', bodyData);
      
      const platform = await service.updatePlatform(parseInt(id), bodyData);
      
      if (!platform) {
        return res.status(404).json({ error: 'Recruitment platform not found' });
      }
      
      res.json({
        message: 'Recruitment platform updated successfully',
        platform
      });
    } catch (error) {
      handleError(res, error, 'Failed to update recruitment platform');
    }
  },
  
  /**
   * Delete recruitment platform record
   * DELETE /api/recruitment-platforms/:id
   */
  async deletePlatform(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const deleted = await service.deletePlatform(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Recruitment platform not found' });
      }
      
      res.json({ message: 'Recruitment platform deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete recruitment platform');
    }
  },
  
  // === ADDITIONAL OPERATIONS ===
  
  /**
   * Get active platform names for dropdown
   * GET /api/recruitment-platforms/names
   */
  async getActivePlatformNames(req, res) {
    try {
      const service = initializeService(req.db);
      
      const platformNames = await service.getActivePlatformNames();
      
      res.json({
        platformNames: platformNames
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment platform names');
    }
  },
  
  // === HEALTH CHECK ===
  
  /**
   * Health check endpoint
   * GET /api/recruitment-platforms/health
   */
  async healthCheck(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Test database connection by getting count
      const result = await service.getAllPlatforms({ limit: 1 });
      
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        module: 'RecruitmentPlatform',
        database: 'Connected',
        totalRecords: result.pagination.total
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        module: 'RecruitmentPlatform',
        error: error.message
      });
    }
  }
};

module.exports = recruitmentPlatformController;