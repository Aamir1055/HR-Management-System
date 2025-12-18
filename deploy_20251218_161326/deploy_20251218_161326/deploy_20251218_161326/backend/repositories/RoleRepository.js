/**
 * Role Repository - Data Access Layer
 * Handles all database operations for user role data
 */

const { UserRoleTableName } = require('../models/UserRole');

class RoleRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new role record
   * @param {Object} roleData - Role data
   * @returns {Promise<Object>} - Created role record
   */
  async create(roleData) {
    try {
      const fields = Object.keys(roleData).join(', ');
      const placeholders = Object.keys(roleData).map(() => '?').join(', ');
      const values = Object.values(roleData);

      const query = `
        INSERT INTO ${UserRoleTableName} (${fields})
        VALUES (${placeholders})
      `;

      const [result] = await this.db.execute(query, values);
      
      // Return the created record
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('RoleRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Find all role records with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of role records
   */
  async findAll(options = {}) {
    try {
      let query = `SELECT * FROM ${UserRoleTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions
      if (options.search) {
        conditions.push('name LIKE ?');
        values.push(`%${options.search}%`);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ORDER BY
      const orderBy = options.orderBy || 'name';
      const orderDirection = options.orderDirection || 'ASC';
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query += ` LIMIT ${parseInt(options.limit)} OFFSET ${parseInt(offset)}`;
      }

      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      console.error('RoleRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find role record by ID
   * @param {number} id - Role ID
   * @returns {Promise<Object|null>} - Role record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${UserRoleTableName} WHERE id = ?`;
      const [rows] = await this.db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('RoleRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find role record by name
   * @param {string} roleName - Role name
   * @returns {Promise<Object|null>} - Role record or null
   */
  async findByName(roleName) {
    try {
      const query = `SELECT * FROM ${UserRoleTableName} WHERE name = ?`;
      const [rows] = await this.db.execute(query, [roleName]);
      return rows[0] || null;
    } catch (error) {
      console.error('RoleRepository.findByName error:', error);
      throw error;
    }
  }

  /**
   * Update role record by ID
   * @param {number} id - Role ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated role record or null
   */
  async update(id, updateData) {
    try {
      // Remove id from updateData if it exists
      const { id: _, ...dataToUpdate } = updateData;
      
      if (Object.keys(dataToUpdate).length === 0) {
        return await this.findById(id);
      }

      const fields = Object.keys(dataToUpdate).map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(dataToUpdate), id];

      const query = `
        UPDATE ${UserRoleTableName} 
        SET ${fields}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      const [result] = await this.db.execute(query, values);
      
      if (result.affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      console.error('RoleRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Delete role record by ID
   * @param {number} id - Role ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${UserRoleTableName} WHERE id = ?`;
      const [result] = await this.db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('RoleRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Get count of role records with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<number>} - Count of records
   */
  async count(options = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${UserRoleTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions (same as findAll)
      if (options.search) {
        conditions.push('name LIKE ?');
        values.push(`%${options.search}%`);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].total;
    } catch (error) {
      console.error('RoleRepository.count error:', error);
      throw error;
    }
  }

  /**
   * Check if role name already exists (for duplicate prevention)
   * @param {string} roleName - Role name to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if role name exists, false otherwise
   */
  async roleNameExists(roleName, excludeId = null) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${UserRoleTableName} WHERE name = ?`;
      const values = [roleName];

      if (excludeId) {
        query += ' AND id != ?';
        values.push(excludeId);
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].count > 0;
    } catch (error) {
      console.error('RoleRepository.roleNameExists error:', error);
      throw error;
    }
  }
}

module.exports = RoleRepository;