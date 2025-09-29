/**
 * Employee Controller - Clean HTTP layer for employee operations
 * Orchestrates service layer operations and handles HTTP request/response
 * Redesigned with layered architecture for better maintainability
 */

// Import services and dependencies
const EmployeeRepository = require('../repositories/EmployeeRepository');
const EmployeeService = require('../services/EmployeeService');
const EmployeeValidationService = require('../services/EmployeeValidationService');
const EmployeeImportService = require('../services/EmployeeImportService');

// Service instances cache (to avoid recreating on each request)
let serviceInstances = null;

/**
 * Initialize service dependencies
 * @param {Object} db - Database connection
 * @returns {Object} - Service instances
 */
function initializeServices(db) {
  if (!serviceInstances) {
    const employeeRepository = new EmployeeRepository(db);
    const validationService = new EmployeeValidationService(employeeRepository);
    const employeeService = new EmployeeService(employeeRepository, validationService);
    const importService = new EmployeeImportService(employeeRepository, validationService, employeeService);

    serviceInstances = {
      employeeRepository,
      validationService,
      employeeService,
      importService
    };
  }
  
  return serviceInstances;
}

/**
 * Build request context from Express request
 * @param {Object} req - Express request object
 * @returns {Object} - Request context
 */
function buildRequestContext(req) {
  return {
    db: req.db,
    user: req.user,
    userOffices: req.userOffices,
    userRole: req.user?.role
  };
}

/**
 * Handle HTTP errors consistently
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 */
function handleError(res, error, defaultMessage = 'Internal server error') {
  console.error('Controller error:', error);
  
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
  
  if (error.message.includes('Access denied') || error.message.includes('permission')) {
    return res.status(403).json({ error: error.message });
  }
  
  // Handle database/server errors
  res.status(500).json({
    error: defaultMessage,
    details: error.message
  });
}

// === MAIN CONTROLLER METHODS ===

const employeeController = {
  
  // === CRUD OPERATIONS ===
  
  /**
   * Get all employees
   */
  async getEmployees(req, res) {
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      
      // Build office filter from middleware
      const { buildOfficeFilter } = require('../middleware/auth');
      const filter = buildOfficeFilter(req, 'e');
      
      const employees = await services.employeeService.getAllEmployees(filter, context);
      
      res.json(employees);
    } catch (error) {
      handleError(res, error, 'Failed to fetch employees');
    }
  },
  
  /**
   * Get employee by ID
   */
  async getEmployeeById(req, res) {
    try {
      const services = initializeServices(req.db);
      const { employeeId } = req.params;
      
      const employee = await services.employeeService.getEmployeeById(employeeId);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json(employee);
    } catch (error) {
      handleError(res, error, 'Failed to fetch employee');
    }
  },
  
  /**
   * Create new employee
   */
  async createEmployee(req, res) {
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      
      console.log('🔍 CREATE - Raw request body:', req.body);
      
      const employee = await services.employeeService.createEmployee(req.body, context);
      
      res.status(201).json(employee);
    } catch (error) {
      handleError(res, error, 'Failed to create employee');
    }
  },
  
  /**
   * Update existing employee
   */
  async updateEmployee(req, res) {
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      const { employeeId } = req.params;
      
      console.log('🔍 UPDATE - Raw request body:', req.body);
      
      const employee = await services.employeeService.updateEmployee(employeeId, req.body, context);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json(employee);
    } catch (error) {
      handleError(res, error, 'Failed to update employee');
    }
  },
  
  /**
   * Delete employee
   */
  async deleteEmployee(req, res) {
    try {
      const services = initializeServices(req.db);
      const { employeeId } = req.params;
      
      const deleted = await services.employeeService.deleteEmployee(employeeId);
      
      if (deleted) {
        res.json({ message: 'Employee deleted successfully' });
      } else {
        res.status(404).json({ error: 'Employee not found' });
      }
    } catch (error) {
      handleError(res, error, 'Failed to delete employee');
    }
  },
  
  // === IMPORT/EXPORT OPERATIONS ===
  
  /**
   * Import employees from Excel
   */
  async importEmployees(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      
      const result = await services.importService.importEmployees(req.file.path, context);
      
      if (result.success) {
        res.json({
          message: result.message,
          imported: result.imported,
          errors: result.errors,
          warnings: result.warnings
        });
      } else {
        res.status(400).json({
          error: result.message,
          errors: result.errors,
          imported: result.imported
        });
      }
    } catch (error) {
      handleError(res, error, 'Import failed');
    }
  },
  
  /**
   * Import secondary employee data
   */
  async importSecondaryEmployeeData(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      
      const result = await services.importService.importSecondaryEmployeeData(req.file.path, context);
      
      res.json({
        message: result.message,
        updated: result.updated,
        errors: result.errors,
        warnings: result.warnings
      });
    } catch (error) {
      handleError(res, error, 'Secondary import failed');
    }
  },
  
  /**
   * Export employees template
   */
  async exportEmployeesTemplate(req, res) {
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      
      const buffer = await services.importService.exportEmployeesTemplate(context);
      
      res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.end(buffer);
    } catch (error) {
      handleError(res, error, 'Failed to create template');
    }
  },
  
  /**
   * Export employees to Excel
   */
  async exportEmployees(req, res) {
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      
      // Build office filter from middleware
      const { buildOfficeFilter } = require('../middleware/auth');
      const filter = buildOfficeFilter(req, 'e');
      
      const buffer = await services.importService.exportEmployees(filter, context);
      
      // Set response headers for file download with cache-busting
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `employees_${timestamp}.xlsx`;
      
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `"${Date.now()}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
      
      res.end(buffer);
      
      console.log(`🎉 Excel export completed: ${fileName}`);
    } catch (error) {
      handleError(res, error, 'Failed to export employees');
    }
  },
  
  // === STATISTICS & SUMMARY OPERATIONS ===
  
  /**
   * Get employee count
   */
  async getEmployeeCount(req, res) {
    try {
      const services = initializeServices(req.db);
      
      // Build office filter from middleware
      const { buildOfficeFilter } = require('../middleware/auth');
      const filter = buildOfficeFilter(req, 'e');
      
      const total = await services.employeeService.getEmployeeCount(filter);
      
      res.json({ total });
    } catch (error) {
      handleError(res, error, 'Failed to get employee count');
    }
  },
  
  /**
   * Get total monthly salary
   */
  async getTotalMonthlySalary(req, res) {
    try {
      const services = initializeServices(req.db);
      
      // Build office filter from middleware
      const { buildOfficeFilter } = require('../middleware/auth');
      const filter = buildOfficeFilter(req, 'e');
      
      const totalSalary = await services.employeeService.getTotalMonthlySalary(filter);
      
      res.json({ totalSalary });
    } catch (error) {
      handleError(res, error, 'Failed to get total salary');
    }
  },
  
  /**
   * Get summary by office
   */
  async getSummaryByOffice(req, res) {
    try {
      const services = initializeServices(req.db);
      
      // Build office filter from middleware
      const { buildOfficeFilter } = require('../middleware/auth');
      const filter = buildOfficeFilter(req, 'o');
      
      const summary = await services.employeeService.getSummaryByOffice(filter);
      
      res.json(summary);
    } catch (error) {
      handleError(res, error, 'Failed to get office summary');
    }
  },
  
  /**
   * Get summary by platform
   */
  async getSummaryByPlatform(req, res) {
    try {
      const services = initializeServices(req.db);
      
      // Build office filter from middleware (consistent with other endpoints)
      const { buildOfficeFilter } = require('../middleware/auth');
      const filter = buildOfficeFilter(req, 'e');
      
      const summary = await services.employeeService.getSummaryByPlatform(filter);
      
      res.json(summary);
    } catch (error) {
      handleError(res, error, 'Failed to get platform summary');
    }
  },
  
  // === UTILITY OPERATIONS ===
  
  /**
   * Get next employee ID (disabled)
   */
  async getNextEmployeeId(req, res) {
    res.status(400).json({ 
      error: 'Auto-generation of employeeId is disabled. Please provide employeeId manually.' 
    });
  },
  
  /**
   * Get office position data
   */
  async getOfficePositionData(req, res) {
    try {
      const { officeId, positionId } = req.params;
      
      const [result] = await req.db.query(`
        SELECT reporting_time, duty_hours 
        FROM office_positions 
        WHERE office_id = ? AND position_id = ?
      `, [officeId, positionId]);
      
      if (result.length > 0) {
        let reportingTime = result[0].reporting_time;
        if (typeof reportingTime === 'string' && reportingTime.includes(':')) {
          const [hours, minutes] = reportingTime.split(':');
          reportingTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        
        res.json({
          reporting_time: reportingTime || 'Not set',
          duty_hours: result[0].duty_hours ? `${result[0].duty_hours} hours` : 'Not set'
        });
      } else {
        res.json({ 
          reporting_time: 'Not set', 
          duty_hours: 'Not set' 
        });
      }
    } catch (error) {
      handleError(res, error, 'Failed to get office position data');
    }
  },
  
  /**
   * Recalculate shift timings for all employees
   */
  async recalculateShiftTimings(req, res) {
    try {
      const services = initializeServices(req.db);
      
      const result = await services.employeeService.recalculateShiftTimings();
      
      res.json(result);
    } catch (error) {
      handleError(res, error, 'Failed to recalculate shift timings');
    }
  },
  
  // === DROPDOWN/OPTION OPERATIONS ===
  
  /**
   * Get office options
   */
  async getOfficeOptions(req, res) {
    try {
      // Build office filter from middleware
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause, params } = buildOfficeFilter(req, 'o');
      
      let sql = 'SELECT o.id, o.name FROM offices o';
      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }
      sql += ' ORDER BY o.name';
      
      const [results] = await req.db.query(sql, params);
      res.json(results);
    } catch (error) {
      handleError(res, error, 'Failed to get office options');
    }
  },
  
  /**
   * Get position options
   */
  async getPositionOptions(req, res) {
    try {
      const [results] = await req.db.query('SELECT id, title FROM positions ORDER BY title');
      res.json(results);
    } catch (error) {
      handleError(res, error, 'Failed to get position options');
    }
  },
  
  /**
   * Get positions by office
   */
  async getPositionsByOffice(req, res) {
    try {
      const { officeId } = req.params;
      
      const [results] = await req.db.query(`
        SELECT DISTINCT p.id, p.title 
        FROM positions p
        INNER JOIN office_positions op ON p.id = op.position_id
        WHERE op.office_id = ?
        ORDER BY p.title
      `, [officeId]);
      
      res.json(results);
    } catch (error) {
      handleError(res, error, 'Failed to get positions by office');
    }
  },
  
  /**
   * Get platform options
   */
  async getPlatformOptions(req, res) {
    try {
      const [results] = await req.db.query('SELECT id, platform_name FROM platforms ORDER BY platform_name');
      res.json(results);
    } catch (error) {
      handleError(res, error, 'Failed to get platform options');
    }
  }
};

module.exports = employeeController;
