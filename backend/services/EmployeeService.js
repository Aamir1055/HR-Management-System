/**
 * Employee Service
 * Core business logic for employee management operations
 * Orchestrates repository, validation, and utility services
 */

const { Employee, EmployeeStatus } = require('../models/Employee');
const { formatDateForStorage, formatDateForDisplay } = require('../utils/dateUtils');
const { computeShiftTimings } = require('../utils/shiftUtils');

class EmployeeService {
  constructor(employeeRepository, validationService) {
    this.employeeRepository = employeeRepository;
    this.validationService = validationService;
  }

  /**
   * Get all employees with filtering and office-based access control
   * @param {Object} filter - Filter options (whereClause, params, status)
   * @param {Object} context - Request context (user, userOffices, etc.)
   * @returns {Array} - Array of employees
   */
  async getAllEmployees(filter = {}, context = {}) {
    try {
      const employees = await this.employeeRepository.findAll(filter);
      
      // Process employees for frontend display
      return employees.map(emp => this.processEmployeeForDisplay(emp));
    } catch (error) {
      console.error('Error in getAllEmployees:', error);
      throw new Error(`Failed to retrieve employees: ${error.message}`);
    }
  }

  /**
   * Get employee by ID
   * @param {string} employeeId - Employee ID
   * @returns {Object|null} - Employee object or null
   */
  async getEmployeeById(employeeId) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      const employee = await this.employeeRepository.findById(employeeId);
      
      return employee ? this.processEmployeeForDisplay(employee) : null;
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      throw new Error(`Failed to retrieve employee: ${error.message}`);
    }
  }

  /**
   * Create new employee
   * @param {Object} employeeData - Employee data
   * @param {Object} context - Request context
   * @returns {Object} - Created employee
   */
  async createEmployee(employeeData, context = {}) {
    try {
      // Process and prepare employee data
      const processedData = await this.prepareEmployeeData(employeeData, context);
      
      // Validate employee data
      const validation = await this.validationService.validateForCreate(processedData, context);
      if (!validation.isValid) {
        const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Create employee instance
      const employee = new Employee(processedData);
      
      // Generate full name from first and last name
      employee.generateFullName();
      
      // Auto-compute shift timings if not provided
      if (!employee.shift_timings) {
        employee.shift_timings = await this.computeEmployeeShiftTimings(employee.office_id, employee.position_id);
      }

      // Create employee in database
      const createdEmployee = await this.employeeRepository.create(employee);
      
      console.log(`✅ Employee created successfully: ${employee.employeeId}`);
      
      return this.processEmployeeForDisplay(createdEmployee);
    } catch (error) {
      console.error('Error in createEmployee:', error);
      
      // Re-throw validation errors as-is
      if (error.validationErrors) {
        throw error;
      }
      
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  /**
   * Update existing employee
   * @param {string} employeeId - Employee ID
   * @param {Object} updateData - Update data
   * @param {Object} context - Request context
   * @returns {Object|null} - Updated employee or null
   */
  async updateEmployee(employeeId, updateData, context = {}) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      // Process and prepare update data
      const processedData = await this.prepareEmployeeData(updateData, context, false);
      
      // Validate update data
      const validation = await this.validationService.validateForUpdate(employeeId, processedData, context);
      if (!validation.isValid) {
        const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Create employee instance with update data
      const employee = new Employee(processedData);
      
      // Generate full name if first/last name changed
      if (processedData.first_name !== undefined || processedData.last_name !== undefined) {
        employee.generateFullName();
      }
      
      // Auto-compute shift timings if office/position changed
      if (processedData.office_id || processedData.position_id) {
        const existingEmployee = await this.employeeRepository.findById(employeeId);
        if (existingEmployee) {
          const newOfficeId = processedData.office_id || existingEmployee.office_id;
          const newPositionId = processedData.position_id || existingEmployee.position_id;
          
          if (newOfficeId !== existingEmployee.office_id || newPositionId !== existingEmployee.position_id) {
            employee.shift_timings = await this.computeEmployeeShiftTimings(newOfficeId, newPositionId);
          }
        }
      }

      // Update employee in database
      const updatedEmployee = await this.employeeRepository.update(employeeId, employee);
      
      if (!updatedEmployee) {
        return null; // Employee not found
      }

      console.log(`✅ Employee updated successfully: ${employeeId}`);
      
      return this.processEmployeeForDisplay(updatedEmployee);
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      
      // Re-throw validation errors as-is
      if (error.validationErrors) {
        throw error;
      }
      
      throw new Error(`Failed to update employee: ${error.message}`);
    }
  }

  /**
   * Delete employee by ID
   * @param {string} employeeId - Employee ID
   * @returns {boolean} - Success status
   */
  async deleteEmployee(employeeId) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      // Check if employee exists
      const existingEmployee = await this.employeeRepository.findById(employeeId);
      if (!existingEmployee) {
        return false; // Employee not found
      }

      // Delete employee from database
      const deleted = await this.employeeRepository.delete(employeeId);
      
      if (deleted) {
        console.log(`✅ Employee deleted successfully: ${employeeId}`);
      }
      
      return deleted;
    } catch (error) {
      console.error('Error in deleteEmployee:', error);
      throw new Error(`Failed to delete employee: ${error.message}`);
    }
  }

  /**
   * Get employee count with filtering
   * @param {Object} filter - Filter options
   * @returns {number} - Employee count
   */
  async getEmployeeCount(filter = {}) {
    try {
      return await this.employeeRepository.getCount(filter);
    } catch (error) {
      console.error('Error in getEmployeeCount:', error);
      throw new Error(`Failed to get employee count: ${error.message}`);
    }
  }

  /**
   * Get total monthly salary with filtering
   * @param {Object} filter - Filter options
   * @returns {number} - Total salary
   */
  async getTotalMonthlySalary(filter = {}) {
    try {
      return await this.employeeRepository.getTotalSalary(filter);
    } catch (error) {
      console.error('Error in getTotalMonthlySalary:', error);
      throw new Error(`Failed to get total salary: ${error.message}`);
    }
  }

  /**
   * Get summary statistics by office
   * @param {Object} filter - Filter options
   * @returns {Array} - Office summaries
   */
  async getSummaryByOffice(filter = {}) {
    try {
      return await this.employeeRepository.getSummaryByOffice(filter);
    } catch (error) {
      console.error('Error in getSummaryByOffice:', error);
      throw new Error(`Failed to get office summary: ${error.message}`);
    }
  }

  /**
   * Get summary statistics by platform
   * @returns {Array} - Platform summaries
   */
  async getSummaryByPlatform() {
    try {
      return await this.employeeRepository.getSummaryByPlatform();
    } catch (error) {
      console.error('Error in getSummaryByPlatform:', error);
      throw new Error(`Failed to get platform summary: ${error.message}`);
    }
  }

  /**
   * Recalculate shift timings for all employees
   * @returns {Object} - Recalculation result
   */
  async recalculateShiftTimings() {
    try {
      return await this.employeeRepository.recalculateShiftTimings();
    } catch (error) {
      console.error('Error in recalculateShiftTimings:', error);
      throw new Error(`Failed to recalculate shift timings: ${error.message}`);
    }
  }

  /**
   * Process employee data before create/update operations
   * @private
   * @param {Object} employeeData - Raw employee data
   * @param {Object} context - Request context
   * @param {boolean} isCreate - Whether this is a create operation
   * @returns {Object} - Processed employee data
   */
  async prepareEmployeeData(employeeData, context = {}, isCreate = true) {
    const processedData = { ...employeeData };

    try {
      // Convert date fields to storage format
      const dateFields = ['joiningDate', 'dob', 'passport_expiry', 'visa_expiry'];
      dateFields.forEach(field => {
        if (processedData[field]) {
          processedData[field] = formatDateForStorage(processedData[field]);
        }
      });

      // Resolve office and position names to IDs
      if (processedData.office_name && !processedData.office_id) {
        processedData.office_id = await this.resolveOfficeNameToId(processedData.office_name, context.db);
      }

      if (processedData.position_name && !processedData.position_id) {
        processedData.position_id = await this.resolvePositionNameToId(processedData.position_name, context.db);
      }

      // Resolve visa type name to database format
      if (processedData.visa_type_name && !processedData.visa_type) {
        processedData.visa_type = processedData.visa_type_name;
      }

      // Resolve platform name
      if (processedData.platform_name && !processedData.platform) {
        processedData.platform = processedData.platform_name;
      }

      // Ensure proper status format
      if (processedData.status !== undefined) {
        processedData.status = EmployeeStatus.fromString(processedData.status);
      }

      // Ensure salary is a number
      if (processedData.monthlySalary !== undefined) {
        processedData.monthlySalary = parseFloat(processedData.monthlySalary) || 0;
      }

      // Default salary currency
      if (!processedData.salary_currency) {
        processedData.salary_currency = 'AED';
      }

      return processedData;
    } catch (error) {
      console.error('Error in prepareEmployeeData:', error);
      throw new Error(`Failed to prepare employee data: ${error.message}`);
    }
  }

  /**
   * Process employee for display (format dates, compute shift timings, etc.)
   * @private
   * @param {Object} employee - Raw employee data from database
   * @returns {Object} - Processed employee for frontend
   */
  processEmployeeForDisplay(employee) {
    const processed = { ...employee };

    try {
      // Ensure boolean status for frontend
      processed.status = EmployeeStatus.toBoolean(employee.status);
      
      // Ensure position_name is set
      processed.position_name = employee.position_title || employee.position_name;

      // Always compute shift timings fresh from reporting_time + duty_hours
      const computedShift = computeShiftTimings(employee.reporting_time, employee.duty_hours);
      processed.shift_timings = computedShift || employee.shift_timings || '9:00 AM - 6:00 PM';

      console.log(`🔍 Employee ${employee.employeeId}: computed shift='${computedShift}' (stored: '${employee.shift_timings}')`);

      // Dates are already formatted by repository transformation
      return processed;
    } catch (error) {
      console.warn('Error processing employee for display:', error);
      return processed;
    }
  }

  /**
   * Compute shift timings for office and position combination
   * @private
   * @param {number} officeId - Office ID
   * @param {number} positionId - Position ID
   * @returns {string|null} - Shift timings string
   */
  async computeEmployeeShiftTimings(officeId, positionId) {
    try {
      if (!officeId || !positionId) return null;

      // This would need to be implemented - getting office_positions data
      // For now, return default
      return '9:00 AM - 6:00 PM';
    } catch (error) {
      console.warn('Failed to compute shift timings:', error);
      return null;
    }
  }

  /**
   * Resolve office name to ID
   * @private
   * @param {string} officeName - Office name
   * @param {Object} db - Database connection
   * @returns {number} - Office ID
   */
  async resolveOfficeNameToId(officeName, db) {
    if (!db) throw new Error('Database connection required');
    
    const [office] = await db.query('SELECT id FROM offices WHERE name = ?', [officeName]);
    if (!office || !office[0]) {
      throw new Error(`Office not found: ${officeName}`);
    }
    
    return office[0].id;
  }

  /**
   * Resolve position name to ID
   * @private
   * @param {string} positionName - Position name
   * @param {Object} db - Database connection
   * @returns {number} - Position ID
   */
  async resolvePositionNameToId(positionName, db) {
    if (!db) throw new Error('Database connection required');
    
    const [position] = await db.query('SELECT id FROM positions WHERE title = ?', [positionName]);
    if (!position || !position[0]) {
      throw new Error(`Position not found: ${positionName}`);
    }
    
    return position[0].id;
  }
}

module.exports = EmployeeService;
