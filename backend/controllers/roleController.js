/**
 * Role Controller - HTTP layer for role master operations
 * Handles HTTP requests and responses for role management
 */

const RoleRepository = require('../repositories/RoleRepository');
const RoleService = require('../services/RoleService');

// Service instance cache
let serviceInstance = null;

/**
 * Initialize service dependencies
 * @param {Object} db - Database connection
 * @returns {Object} - Service instance
 */
function initializeService(db) {
  if (!serviceInstance) {
    const roleRepository = new RoleRepository(db);
    serviceInstance = new RoleService(roleRepository);
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
  console.error('Role Controller error:', error);
  
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

const roleController = {
  
  // === CRUD OPERATIONS ===
  
  /**
   * Create new role record
   * POST /api/roles
   */
  async createRole(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Handle null prototype objects by creating a proper object
      const roleData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive
      };
      
      console.log('🔍 CREATE ROLE - Request body:', req.body);
      console.log('🔍 CREATE ROLE - Normalized data:', roleData);
      
      const role = await service.createRole(roleData);
      
      res.status(201).json({
        message: 'Role created successfully',
        role
      });
    } catch (error) {
      handleError(res, error, 'Failed to create role');
    }
  },
  
  /**
   * Get all role records with filtering and pagination
   * GET /api/roles
   */
  async getAllRoles(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Extract query parameters
      const options = {
        search: req.query.search,
        orderBy: req.query.orderBy,
        orderDirection: req.query.orderDirection,
        limit: req.query.limit,
        offset: req.query.offset
      };
      
      const result = await service.getAllRoles(options);
      
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Failed to fetch roles');
    }
  },
  
  /**
   * Get role record by ID
   * GET /api/roles/:id
   */
  async getRoleById(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const role = await service.getRoleById(parseInt(id));
      
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      
      res.json(role);
    } catch (error) {
      handleError(res, error, 'Failed to fetch role');
    }
  },
  
  /**
   * Update role record
   * PUT /api/roles/:id
   */
  async updateRole(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      // Handle null prototype objects by creating a proper object
      const roleData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive
      };
      
      console.log('🔍 UPDATE ROLE - ID:', id);
      console.log('🔍 UPDATE ROLE - Request body:', req.body);
      console.log('🔍 UPDATE ROLE - Normalized data:', roleData);
      
      const role = await service.updateRole(parseInt(id), roleData);
      
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      
      res.json({
        message: 'Role updated successfully',
        role
      });
    } catch (error) {
      handleError(res, error, 'Failed to update role');
    }
  },
  
  /**
   * Delete role record
   * DELETE /api/roles/:id
   */
  async deleteRole(req, res) {
    try {
      const service = initializeService(req.db);
      const { id } = req.params;
      
      const deleted = await service.deleteRole(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Role not found' });
      }
      
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete role');
    }
  },
  
  // === ADDITIONAL OPERATIONS ===
  
  /**
   * Get role names for dropdown
   * GET /api/roles/names
   */
  async getRoleNames(req, res) {
    try {
      const service = initializeService(req.db);
      
      const roleNames = await service.getRoleNames();
      
      res.json({
        roleNames: roleNames
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch role names');
    }
  },
  
  // === HEALTH CHECK ===
  
  /**
   * Health check endpoint
   * GET /api/roles/health
   */
  async healthCheck(req, res) {
    try {
      const service = initializeService(req.db);
      
      // Test database connection by getting count
      const result = await service.getAllRoles({ limit: 1 });
      
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        module: 'Role',
        database: 'Connected',
        totalRecords: result.pagination.total
      });
    } catch (error) {
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        module: 'Role',
        error: error.message
      });
    }
  }
};

module.exports = roleController;