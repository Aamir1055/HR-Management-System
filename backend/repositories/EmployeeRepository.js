/**
 * Employee Repository
 * Database access layer for employee operations
 * Handles all SQL queries and database interactions
 */

const { Employee, EmployeeTableName, EmployeeStatus } = require('../models/Employee');
const { formatDateForDisplay } = require('../utils/dateUtils');

class EmployeeRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all employees with office filtering
   * @param {Object} filter - Filter options
   * @returns {Array} - Array of employees
   */
  async findAll(filter = {}) {
    try {
      let sql = `
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM ${EmployeeTableName} e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      `;
      
      const conditions = [];
      const params = [];

      // Apply office filter if provided
      if (filter.whereClause) {
        conditions.push(filter.whereClause);
        params.push(...(filter.params || []));
      }

      // Apply status filter
      if (filter.status !== undefined) {
        conditions.push('e.status = ?');
        params.push(filter.status);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      sql += ` ORDER BY e.employeeId`;
      
      const [rows] = await this.db.query(sql, params);
      
      return rows.map(row => this.transformDbRow(row));
    } catch (error) {
      console.error('Database error in findAll:', error);
      throw new Error(`Failed to fetch employees: ${error.message}`);
    }
  }

  /**
   * Find employee by ID
   * @param {string} employeeId - Employee ID
   * @returns {Object|null} - Employee object or null
   */
  async findById(employeeId) {
    try {
      const sql = `
        SELECT e.*, o.name AS office_name, p.title AS position_title,
               op.reporting_time, op.duty_hours, e.visa_type AS visa_type_name
        FROM ${EmployeeTableName} e
        LEFT JOIN offices o ON e.office_id = o.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
        WHERE e.employeeId = ?
      `;
      
      const [rows] = await this.db.query(sql, [employeeId]);
      
      return rows.length > 0 ? this.transformDbRow(rows[0]) : null;
    } catch (error) {
      console.error('Database error in findById:', error);
      throw new Error(`Failed to fetch employee: ${error.message}`);
    }
  }

  /**
   * Create new employee
   * @param {Employee} employee - Employee object
   * @returns {Employee} - Created employee
   */
  async create(employee) {
    try {
      // Ensure required columns exist
      await this.ensureColumnsExist();
      
      const dbData = employee.toDbFormat();
      
      const sql = `
        INSERT INTO ${EmployeeTableName} 
        (employeeId, name, first_name, last_name, nationality, email, office_id, position_id, monthlySalary, joiningDate, status,
          dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
          primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact, emergency_contact_relation, shift_timings, last_working_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        dbData.employeeId, dbData.name, dbData.first_name, dbData.last_name, dbData.nationality, 
        dbData.email, dbData.office_id, dbData.position_id, dbData.monthlySalary, dbData.joiningDate, dbData.status,
        dbData.dob, dbData.passport_number, dbData.passport_expiry, dbData.visa_type, dbData.visa_expiry, 
        dbData.platform, dbData.address, dbData.current_address, dbData.phone, dbData.whatsapp, dbData.gender,
        dbData.primary_language, dbData.secondary_language, dbData.marital_status, dbData.hiring_source, 
        dbData.salary_currency, dbData.emirates_id, dbData.emergency_contact, dbData.emergency_contact_relation, dbData.shift_timings, dbData.last_working_date
      ];
      
      await this.db.query(sql, values);
      
      // Return the created employee
      return await this.findById(employee.employeeId);
    } catch (error) {
      console.error('Database error in create:', error);
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  /**
   * Update existing employee
   * @param {string} employeeId - Employee ID
   * @param {Employee} employee - Employee object with updates
   * @returns {Employee|null} - Updated employee or null
   */
  async update(employeeId, employee) {
    try {
      // Ensure required columns exist
      await this.ensureColumnsExist();
      
      // Handle both Employee instances and plain objects
      const dbData = employee.toDbFormat ? employee.toDbFormat() : employee;
      
      // Build dynamic UPDATE query - only update fields that are actually provided
      const updateFields = [];
      const values = [];
      
      // List of all possible fields that can be updated
      const allowedFields = [
        'name', 'first_name', 'last_name', 'nationality', 'email', 'office_id', 'position_id',
        'monthlySalary', 'joiningDate', 'status', 'dob', 'passport_number', 'passport_expiry',
        'visa_type', 'visa_expiry', 'platform', 'address', 'current_address', 'phone', 'whatsapp',
        'gender', 'primary_language', 'secondary_language', 'marital_status', 'hiring_source',
        'salary_currency', 'emirates_id', 'emergency_contact', 'emergency_contact_relation', 'shift_timings', 'last_working_date'
      ];
      
      // Only include fields that are explicitly provided in the update data
      allowedFields.forEach(field => {
        if (dbData.hasOwnProperty(field) && dbData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          values.push(dbData[field]);
        }
      });
      
      // If no fields to update, return the existing employee
      if (updateFields.length === 0) {
        console.warn('No fields to update for employee:', employeeId);
        return await this.findById(employeeId);
      }
      
      values.push(employeeId); // Add employeeId for WHERE clause
      
      const sql = `
        UPDATE ${EmployeeTableName} SET
          ${updateFields.join(', ')}
        WHERE employeeId = ?
      `;
      
      const [result] = await this.db.query(sql, values);
      
      if (result.affectedRows === 0) {
        return null; // Employee not found
      }
      
      console.log(`✅ Updated ${updateFields.length} field(s) for employee: ${employeeId}`);
      
      // Return the updated employee
      return await this.findById(employeeId);
    } catch (error) {
      console.error('Database error in update:', error);
      throw new Error(`Failed to update employee: ${error.message}`);
    }
  }

  /**
   * Delete employee by ID
   * @param {string} employeeId - Employee ID
   * @returns {boolean} - Success status
   */
  async delete(employeeId) {
    try {
      const sql = `DELETE FROM ${EmployeeTableName} WHERE employeeId = ?`;
      const [result] = await this.db.query(sql, [employeeId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Database error in delete:', error);
      throw new Error(`Failed to delete employee: ${error.message}`);
    }
  }

  /**
   * Bulk insert employees (for import operations)
   * @param {Array} employees - Array of employee data
   * @returns {Object} - Insert result
   */
  async bulkInsert(employees) {
    try {
      if (!employees || employees.length === 0) {
        return { insertedCount: 0, errors: [] };
      }

      // Ensure required columns exist
      await this.ensureColumnsExist();

      const placeholders = employees.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = employees.flat();
      
      const sql = `
        INSERT INTO ${EmployeeTableName} 
        (employeeId, name, first_name, last_name, nationality, email, office_id, position_id, monthlySalary, joiningDate, status,
          dob, passport_number, passport_expiry, visa_type, visa_expiry, platform, address, current_address, phone, whatsapp, gender,
          primary_language, secondary_language, marital_status, hiring_source, salary_currency, emirates_id, emergency_contact, emergency_contact_relation, shift_timings, last_working_date)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          nationality = VALUES(nationality),
          email = VALUES(email),
          office_id = VALUES(office_id),
          position_id = VALUES(position_id),
          monthlySalary = VALUES(monthlySalary),
          joiningDate = VALUES(joiningDate),
          status = VALUES(status),
          dob = VALUES(dob),
          passport_number = VALUES(passport_number),
          passport_expiry = VALUES(passport_expiry),
          visa_type = VALUES(visa_type),
          visa_expiry = VALUES(visa_expiry),
          platform = VALUES(platform),
          address = VALUES(address),
          current_address = VALUES(current_address),
          phone = VALUES(phone),
          whatsapp = VALUES(whatsapp),
          gender = VALUES(gender),
          primary_language = VALUES(primary_language),
          secondary_language = VALUES(secondary_language),
          marital_status = VALUES(marital_status),
          hiring_source = VALUES(hiring_source),
          salary_currency = VALUES(salary_currency),
          emirates_id = VALUES(emirates_id),
          emergency_contact = VALUES(emergency_contact),
          emergency_contact_relation = VALUES(emergency_contact_relation),
          shift_timings = VALUES(shift_timings),
          last_working_date = VALUES(last_working_date)
      `;
      
      const [result] = await this.db.query(sql, flatValues);
      
      return {
        insertedCount: result.affectedRows,
        errors: []
      };
    } catch (error) {
      console.error('Database error in bulkInsert:', error);
      throw new Error(`Failed to bulk insert employees: ${error.message}`);
    }
  }

  /**
   * Update employee by employeeId with specific fields
   * @param {string} employeeId - Employee ID
   * @param {Object} updates - Fields to update
   * @returns {boolean} - Success status
   */
  async updateFields(employeeId, updates) {
    try {
      if (!updates || Object.keys(updates).length === 0) {
        return false;
      }

      const fields = Object.keys(updates).map(field => `${field} = ?`);
      const values = Object.values(updates);
      values.push(employeeId);
      
      const sql = `UPDATE ${EmployeeTableName} SET ${fields.join(', ')} WHERE employeeId = ?`;
      
      const [result] = await this.db.query(sql, values);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Database error in updateFields:', error);
      throw new Error(`Failed to update employee fields: ${error.message}`);
    }
  }

  /**
   * Get employee count
   * @param {Object} filter - Filter options
   * @returns {number} - Employee count
   */
  async getCount(filter = {}) {
    try {
      let sql = `SELECT COUNT(*) AS total FROM ${EmployeeTableName} e`;
      const params = [];

      if (filter.whereClause) {
        sql += ` WHERE ${filter.whereClause}`;
        params.push(...(filter.params || []));
      }
      
      const [result] = await this.db.query(sql, params);
      return result[0].total;
    } catch (error) {
      console.error('Database error in getCount:', error);
      throw new Error(`Failed to get employee count: ${error.message}`);
    }
  }

  /**
   * Get total monthly salary
   * @param {Object} filter - Filter options
   * @returns {number} - Total salary
   */
  async getTotalSalary(filter = {}) {
    try {
      let sql = `SELECT SUM(monthlySalary) AS totalSalary FROM ${EmployeeTableName} e WHERE e.status = 1`;
      const params = [];

      if (filter.whereClause) {
        sql += ` AND ${filter.whereClause}`;
        params.push(...(filter.params || []));
      }
      
      const [result] = await this.db.query(sql, params);
      return result[0].totalSalary || 0;
    } catch (error) {
      console.error('Database error in getTotalSalary:', error);
      throw new Error(`Failed to get total salary: ${error.message}`);
    }
  }

  /**
   * Get summary by office
   * @param {Object} filter - Filter options
   * @returns {Array} - Office summaries
   */
  async getSummaryByOffice(filter = {}) {
    try {
      let sql = `
        SELECT o.id AS office_id, o.name AS office,
          COUNT(e.id) AS totalEmployees,
          SUM(e.monthlySalary) AS totalSalary
        FROM offices o
        LEFT JOIN ${EmployeeTableName} e ON o.id = e.office_id AND e.status = 1
      `;
      
      const params = [];

      if (filter.whereClause) {
        sql += ` WHERE ${filter.whereClause}`;
        params.push(...(filter.params || []));
      }
      
      sql += ` GROUP BY o.id`;
      
      const [results] = await this.db.query(sql, params);
      return results;
    } catch (error) {
      console.error('Database error in getSummaryByOffice:', error);
      throw new Error(`Failed to get office summary: ${error.message}`);
    }
  }

  /**
   * Get summary by platform
   * @param {Object} filter - Filter options
   * @returns {Array} - Platform summaries
   */
  async getSummaryByPlatform(filter = {}) {
    try {
      // First get platform-assigned employees
      let sql = `
        SELECT p.id AS platform_id, p.platform_name AS platform,
          COUNT(e.id) AS totalEmployees,
          SUM(e.monthlySalary) AS totalSalary
        FROM platforms p
        LEFT JOIN ${EmployeeTableName} e ON p.platform_name = e.platform
      `;
      
      const params = [];

      // Apply office filter if provided
      if (filter.whereClause) {
        sql += ` WHERE ${filter.whereClause}`;
        params.push(...(filter.params || []));
      }
      
      sql += `
        GROUP BY p.id, p.platform_name
      `;
      
      // Then get unassigned employees and add as "Unassigned" platform
      let unassignedSql = `
        SELECT 0 AS platform_id, 'Unassigned Platform' AS platform,
          COUNT(e.id) AS totalEmployees,
          SUM(e.monthlySalary) AS totalSalary
        FROM ${EmployeeTableName} e
        WHERE (e.platform IS NULL OR TRIM(e.platform) = '' OR e.platform = '')
      `;
      
      const unassignedParams = [];
      
      // Apply same office filter for unassigned employees
      if (filter.whereClause) {
        unassignedSql += ` AND ${filter.whereClause}`;
        unassignedParams.push(...(filter.params || []));
      }
      
      // Combine both queries
      const finalSql = `
        (${sql})
        UNION ALL
        (${unassignedSql})
        ORDER BY platform
      `;
      
      const allParams = [...params, ...unassignedParams];
      const [results] = await this.db.query(finalSql, allParams);
      
      // Filter out entries with 0 employees (including empty unassigned)
      return results.filter(result => result.totalEmployees > 0);
    } catch (error) {
      console.error('Database error in getSummaryByPlatform:', error);
      throw new Error(`Failed to get platform summary: ${error.message}`);
    }
  }

  /**
   * Update shift timings for all employees
   * @returns {Object} - Update result
   */
  async recalculateShiftTimings() {
    try {
      // Ensure shift_timings column exists
      await this.ensureColumnsExist();

      const sql = `
        SELECT e.employeeId, e.office_id, e.position_id, op.reporting_time, op.duty_hours
        FROM ${EmployeeTableName} e
        LEFT JOIN office_positions op ON e.office_id = op.office_id AND e.position_id = op.position_id
      `;
      
      const [rows] = await this.db.query(sql);
      
      let updated = 0;
      const { computeShiftTimings } = require('../utils/shiftUtils'); // We'll create this utility
      
      for (const row of rows) {
        const shiftTimings = computeShiftTimings(row.reporting_time, row.duty_hours);
        if (shiftTimings) {
          const updateSql = 'UPDATE ${EmployeeTableName} SET shift_timings = ? WHERE employeeId = ?';
          const [result] = await this.db.query(updateSql, [shiftTimings, row.employeeId]);
          if (result.affectedRows) updated++;
        }
      }
      
      return { total: rows.length, updated };
    } catch (error) {
      console.error('Database error in recalculateShiftTimings:', error);
      throw new Error(`Failed to recalculate shift timings: ${error.message}`);
    }
  }

  /**
   * Ensure all required columns exist in the employees table
   * @private
   */
  async ensureColumnsExist() {
    try {
      const columns = [
        'first_name VARCHAR(50) NULL',
        'last_name VARCHAR(50) NULL',
        'nationality VARCHAR(50) NULL',
        'emergency_contact_relation VARCHAR(50) NULL',
        'shift_timings VARCHAR(100) NULL'
      ];

      for (const column of columns) {
        const [field] = column.split(' ');
        try {
          await this.db.query(`ALTER TABLE ${EmployeeTableName} ADD COLUMN IF NOT EXISTS ${column}`);
        } catch (err) {
          // Column might already exist, ignore error
          console.log(`Column ${field} check completed (might already exist)`);
        }
      }
    } catch (error) {
      console.warn('Failed to ensure columns exist:', error.message);
      // Don't throw error as columns might already exist
    }
  }

  /**
   * Transform database row to employee object
   * @private
   * @param {Object} row - Database row
   * @returns {Object} - Transformed employee object
   */
  transformDbRow(row) {
    return {
      ...row,
      status: EmployeeStatus.toBoolean(row.status),
      position_name: row.position_title,
      // Format dates for display
      joiningDate: formatDateForDisplay(row.joiningDate),
      dob: formatDateForDisplay(row.dob),
      passport_expiry: formatDateForDisplay(row.passport_expiry),
      visa_expiry: formatDateForDisplay(row.visa_expiry)
    };
  }
}

module.exports = EmployeeRepository;
