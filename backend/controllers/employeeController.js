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
const ImprovedEmployeeImportService = require('../services/ImprovedEmployeeImportService');
const { logAudit } = require('../middleware/auditMiddleware');

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
    const improvedImportService = new ImprovedEmployeeImportService(employeeRepository, validationService, employeeService);

    serviceInstances = {
      employeeRepository,
      validationService,
      employeeService,
      importService,
      improvedImportService
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
      
      // Log audit entry
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        action: 'CREATE',
        entityType: 'employees',
        entityId: employee.id,
        entityName: `${employee.first_name} ${employee.last_name}`,
        description: `Created employee: ${employee.first_name} ${employee.last_name} (${employee.employee_id})`,
        newValues: employee,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
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
      
      // Get old employee data for audit log
      const oldEmployee = await services.employeeRepository.getEmployeeById(employeeId);
      
      const employee = await services.employeeService.updateEmployee(employeeId, req.body, context);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      // Log audit entry with old and new values
      const changes = [];
      if (oldEmployee.first_name !== employee.first_name) changes.push('first name');
      if (oldEmployee.last_name !== employee.last_name) changes.push('last name');
      if (oldEmployee.email !== employee.email) changes.push('email');
      if (oldEmployee.phone !== employee.phone) changes.push('phone');
      if (oldEmployee.designation !== employee.designation) changes.push('designation');
      if (oldEmployee.status !== employee.status) changes.push('status');
      
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        action: 'UPDATE',
        entityType: 'employees',
        entityId: employee.id,
        entityName: `${employee.first_name} ${employee.last_name}`,
        description: `Updated employee: ${employee.first_name} ${employee.last_name} - Changed: ${changes.join(', ') || 'various fields'}`,
        oldValues: oldEmployee,
        newValues: employee,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
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
      
      // Get employee data before deletion for audit log
      const employee = await services.employeeRepository.getEmployeeById(employeeId);
      
      const deleted = await services.employeeService.deleteEmployee(employeeId);
      
      if (deleted) {
        // Log audit entry
        if (employee) {
          await logAudit({
            userId: req.user.id,
            username: req.user.username,
            action: 'DELETE',
            entityType: 'employees',
            entityId: employeeId,
            entityName: `${employee.first_name} ${employee.last_name}`,
            description: `Deleted employee: ${employee.first_name} ${employee.last_name} (${employee.employee_id})`,
            oldValues: employee,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });
        }
        
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
   * Import employees from Excel (with improved flexibility)
   */
  async importEmployees(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const services = initializeServices(req.db);
      const context = buildRequestContext(req);
      
      console.log('[CONTROLLER] Using improved import service for better compatibility');
      
      // Try improved import first (more flexible)
      const result = await services.improvedImportService.importEmployeesImproved(req.file.path, context);
      
      if (result.success) {
        res.json({
          message: result.message,
          imported: result.imported,
          errors: result.errors,
          warnings: result.warnings || []
        });
      } else {
        // If improved import fails, try fallback to original
        console.log('[CONTROLLER] Improved import failed, trying original import...');
        const fallbackResult = await services.importService.importEmployees(req.file.path, context);
        
        if (fallbackResult.success) {
          res.json({
            message: `${fallbackResult.message} (using fallback import)`,
            imported: fallbackResult.imported,
            errors: fallbackResult.errors,
            warnings: fallbackResult.warnings || []
          });
        } else {
          res.status(400).json({
            error: `Both import methods failed. Improved: ${result.message}. Original: ${fallbackResult.message}`,
            errors: [...(result.errors || []), ...(fallbackResult.errors || [])],
            imported: Math.max(result.imported || 0, fallbackResult.imported || 0)
          });
        }
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
   * Get positions by office (configured positions)
   * Falls back to all positions if office has no specific position assignments
   */
  async getPositionsByOffice(req, res) {
    try {
      const { officeId } = req.params;
      
      // First try to get office-specific positions
      const [officePositions] = await req.db.query(`
        SELECT DISTINCT p.id, p.title 
        FROM positions p
        INNER JOIN office_positions op ON p.id = op.position_id
        WHERE op.office_id = ?
        ORDER BY p.title
      `, [officeId]);
      
      // If office has configured positions, return them
      if (officePositions.length > 0) {
        return res.json(officePositions);
      }
      
      // Otherwise, return all positions
      const [allPositions] = await req.db.query(`
        SELECT id, title 
        FROM positions 
        ORDER BY title
      `);
      
      res.json(allPositions);
    } catch (error) {
      handleError(res, error, 'Failed to get positions by office');
    }
  },
  
  /**
   * Get positions actually held by employees in office
   */
  async getActivePositionsByOffice(req, res) {
    try {
      const { officeId } = req.params;
      
      const [results] = await req.db.query(`
        SELECT DISTINCT p.id, p.title, COUNT(e.id) as employee_count
        FROM positions p
        INNER JOIN employees e ON p.id = e.position_id
        WHERE e.office_id = ? AND e.status = 1
        GROUP BY p.id, p.title
        ORDER BY p.title
      `, [officeId]);
      
      res.json(results);
    } catch (error) {
      handleError(res, error, 'Failed to get active positions by office');
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
  },

  /**
   * Get employees with visa expiring in given date range
   */
  async getVisaExpiries(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to current month if no dates provided
      const now = new Date();
      const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const fromDate = startDate || defaultStartDate;
      const toDate = endDate || defaultEndDate;
      
      console.log('🔍 Visa Expiry Query Debug:');
      console.log('  - Requested startDate:', startDate);
      console.log('  - Requested endDate:', endDate);
      console.log('  - Final fromDate:', fromDate);
      console.log('  - Final toDate:', toDate);
      console.log('  - Current server date:', now.toISOString().split('T')[0]);
      
      // Build office filter from middleware
      const { buildOfficeFilter } = require('../middleware/auth');
      const { whereClause: officeFilter, params: officeParams } = buildOfficeFilter(req, 'e');
      
      let sql = `
        SELECT 
          e.employeeId,
          e.name,
          e.first_name,
          e.last_name,
          e.visa_expiry,
          o.name as office_name,
          p.title as position_name,
          DATEDIFF(e.visa_expiry, CURDATE()) as days_until_expiry
        FROM employees e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.visa_expiry IS NOT NULL 
          AND e.visa_expiry BETWEEN ? AND ?
          AND e.status = 1
      `;
      
      let queryParams = [fromDate, toDate];
      
      // Add office filter if applicable
      if (officeFilter) {
        sql += ` AND ${officeFilter}`;
        queryParams.push(...officeParams);
      }
      
      sql += ` ORDER BY e.visa_expiry ASC, e.name ASC`;
      
      const [results] = await req.db.query(sql, queryParams);
      
      console.log(`  - SQL Query: ${sql}`);
      console.log(`  - Query Params: [${queryParams.join(', ')}]`);
      console.log(`  - Raw results count: ${results.length}`);
      if (results.length > 0) {
        console.log('  - Sample raw result:', {
          visa_expiry: results[0].visa_expiry,
          name: results[0].name,
          days_until_expiry: results[0].days_until_expiry
        });
      }
      
      // Format the results
      const formattedResults = results.map(employee => {
        // Fix timezone issue: extract date part directly without timezone conversion
        let visaExpiryFormatted = employee.visa_expiry;
        if (employee.visa_expiry instanceof Date) {
          // Use local date components to avoid timezone conversion
          const year = employee.visa_expiry.getFullYear();
          const month = String(employee.visa_expiry.getMonth() + 1).padStart(2, '0');
          const day = String(employee.visa_expiry.getDate()).padStart(2, '0');
          visaExpiryFormatted = `${year}-${month}-${day}`;
        } else if (typeof employee.visa_expiry === 'string') {
          // If already a string, extract date part
          visaExpiryFormatted = employee.visa_expiry.split('T')[0];
        }
        
        return {
          ...employee,
          visa_expiry: visaExpiryFormatted,
          full_name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
          is_expired: employee.days_until_expiry < 0,
          is_expiring_soon: employee.days_until_expiry >= 0 && employee.days_until_expiry <= 30
        };
      });
      
      console.log(`  - Formatted results count: ${formattedResults.length}`);
      if (formattedResults.length > 0) {
        console.log('  - Sample formatted result:', {
          visa_expiry: formattedResults[0].visa_expiry,
          full_name: formattedResults[0].full_name,
          days_until_expiry: formattedResults[0].days_until_expiry
        });
      }
      
      res.json({
        visaExpiries: formattedResults,
        dateRange: {
          startDate: fromDate,
          endDate: toDate
        },
        summary: {
          total: formattedResults.length,
          expired: formattedResults.filter(e => e.is_expired).length,
          expiringSoon: formattedResults.filter(e => e.is_expiring_soon).length
        }
      });
    } catch (error) {
      handleError(res, error, 'Failed to get visa expiries');
    }
  }
};

module.exports = employeeController;
