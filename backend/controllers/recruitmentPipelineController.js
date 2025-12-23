/**
 * Recruitment Pipeline Controller - HTTP layer for recruitment pipeline master operations
 * Handles HTTP requests and responses for recruitment pipeline management
 */

const RecruitmentPipelineRepository = require('../repositories/RecruitmentPipelineRepository');
const RecruitmentPipelineService = require('../services/RecruitmentPipelineService');

// Service instance cache
let serviceInstance = null;

/**
 * Initialize service dependencies
 * @param {Object} db - Database connection
 * @returns {Object} - Service instance
 */
function initializeService(db) {
  if (!serviceInstance) {
    const pipelineRepository = new RecruitmentPipelineRepository(db);
    serviceInstance = new RecruitmentPipelineService(pipelineRepository);
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
  console.error('Recruitment Pipeline Controller error:', error);
  
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

const recruitmentPipelineController = {
  
  // === CRUD OPERATIONS ===
  
  /**
   * Create new recruitment pipeline record
   * POST /api/recruitment-pipelines
   */
  async createPipeline(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Handle null prototype objects from body-parser
      const bodyData = JSON.parse(JSON.stringify(req.body));
      console.log('🔍 CREATE PIPELINE - Request body:', bodyData);
      
      const pipeline = await service.createPipeline(bodyData);
      
      res.status(201).json({
        message: 'Recruitment pipeline created successfully',
        pipeline
      });
    } catch (error) {
      handleError(res, error, 'Failed to create recruitment pipeline');
    }
  },
  
  /**
   * Get all recruitment pipeline records with filtering and pagination
   * GET /api/recruitment-pipelines
   */
  async getAllPipelines(req, res) {
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
      
      const result = await service.getAllPipelines(options);
      
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment pipelines');
    }
  },
  
  /**
   * Get recruitment pipeline record by ID
   * GET /api/recruitment-pipelines/:id
   */
  async getPipelineById(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const pipeline = await service.getPipelineById(parseInt(id));
      
      if (!pipeline) {
        return res.status(404).json({ error: 'Recruitment pipeline not found' });
      }
      
      res.json(pipeline);
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment pipeline');
    }
  },
  
  /**
   * Update recruitment pipeline record
   * PUT /api/recruitment-pipelines/:id
   */
  async updatePipeline(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      // Handle null prototype objects from body-parser
      const bodyData = JSON.parse(JSON.stringify(req.body));
      console.log('🔍 UPDATE PIPELINE - ID:', id);
      console.log('🔍 UPDATE PIPELINE - Request body:', bodyData);
      
      const pipeline = await service.updatePipeline(parseInt(id), bodyData);
      
      if (!pipeline) {
        return res.status(404).json({ error: 'Recruitment pipeline not found' });
      }
      
      res.json({
        message: 'Recruitment pipeline updated successfully',
        pipeline
      });
    } catch (error) {
      handleError(res, error, 'Failed to update recruitment pipeline');
    }
  },
  
  /**
   * Delete recruitment pipeline record
   * DELETE /api/recruitment-pipelines/:id
   */
  async deletePipeline(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const deleted = await service.deletePipeline(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Recruitment pipeline not found' });
      }
      
      res.json({ message: 'Recruitment pipeline deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete recruitment pipeline');
    }
  },
  
  // === ADDITIONAL OPERATIONS ===
  
  /**
   * Get active pipeline names for dropdown
   * GET /api/recruitment-pipelines/names
   */
  async getActivePipelineNames(req, res) {
    try {
      const service = initializeService(req.db);
      
      const pipelineNames = await service.getActivePipelineNames();
      
      res.json({
        pipelineNames: pipelineNames
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch recruitment pipeline names');
    }
  },
  
  // === HEALTH CHECK ===
  
  /**
   * Health check endpoint
   * GET /api/recruitment-pipelines/health
   */
  async healthCheck(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Test database connection by getting count
      const result = await service.getAllPipelines({ limit: 1 });
      
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        module: 'RecruitmentPipeline',
        database: 'Connected',
        totalRecords: result.pagination.total
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        module: 'RecruitmentPipeline',
        error: error.message
      });
    }
  }
};

module.exports = recruitmentPipelineController;