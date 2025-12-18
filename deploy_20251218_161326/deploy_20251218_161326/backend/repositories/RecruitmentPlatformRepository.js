/**
 * Recruitment Platform Repository - Data Access Layer
 * Handles all database operations for recruitment platform master data
 */

const { RecruitmentPlatformTableName } = require('../models/RecruitmentPlatform');

class RecruitmentPlatformRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new recruitment platform record
   * @param {Object} platformData - Platform data
   * @returns {Promise<Object>} - Created platform record
   */
  async create(platformData) {
    try {
      const fields = Object.keys(platformData).join(', ');
      const placeholders = Object.keys(platformData).map(() => '?').join(', ');
      const values = Object.values(platformData);

      const query = `
        INSERT INTO ${RecruitmentPlatformTableName} (${fields})
        VALUES (${placeholders})
      `;

      const [result] = await this.db.execute(query, values);
      
      // Return the created record
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('RecruitmentPlatformRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Find all recruitment platform records with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of platform records
   */
  async findAll(options = {}) {
    try {
      let query = `SELECT * FROM ${RecruitmentPlatformTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions
      if (options.search) {
        conditions.push('(platformName LIKE ? OR description LIKE ?)');
        values.push(`%${options.search}%`, `%${options.search}%`);
      }

      if (options.isActive !== undefined) {
        conditions.push('isActive = ?');
        values.push(options.isActive);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ORDER BY
      const orderBy = options.orderBy || 'platformName';
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
      console.error('RecruitmentPlatformRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment platform record by ID
   * @param {number} id - Platform ID
   * @returns {Promise<Object|null>} - Platform record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${RecruitmentPlatformTableName} WHERE platformId = ?`;
      const [rows] = await this.db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentPlatformRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment platform record by name
   * @param {string} platformName - Platform name
   * @returns {Promise<Object|null>} - Platform record or null
   */
  async findByName(platformName) {
    try {
      const query = `SELECT * FROM ${RecruitmentPlatformTableName} WHERE platformName = ?`;
      const [rows] = await this.db.execute(query, [platformName]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentPlatformRepository.findByName error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment platform record by ID
   * @param {number} id - Platform ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated platform record or null
   */
  async update(id, updateData) {
    try {
      // Remove id from updateData if it exists
      const { platformId: _, ...dataToUpdate } = updateData;
      
      if (Object.keys(dataToUpdate).length === 0) {
        return await this.findById(id);
      }

      const fields = Object.keys(dataToUpdate).map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(dataToUpdate), id];

      const query = `
        UPDATE ${RecruitmentPlatformTableName} 
        SET ${fields}, updated_at = CURRENT_TIMESTAMP 
        WHERE platformId = ?
      `;

      const [result] = await this.db.execute(query, values);
      
      if (result.affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      console.error('RecruitmentPlatformRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment platform record by ID
   * @param {number} id - Platform ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${RecruitmentPlatformTableName} WHERE platformId = ?`;
      const [result] = await this.db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('RecruitmentPlatformRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Get count of recruitment platform records with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<number>} - Count of records
   */
  async count(options = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${RecruitmentPlatformTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions (same as findAll)
      if (options.search) {
        conditions.push('(platformName LIKE ? OR description LIKE ?)');
        values.push(`%${options.search}%`, `%${options.search}%`);
      }

      if (options.isActive !== undefined) {
        conditions.push('isActive = ?');
        values.push(options.isActive);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].total;
    } catch (error) {
      console.error('RecruitmentPlatformRepository.count error:', error);
      throw error;
    }
  }

  /**
   * Check if platform name already exists (for duplicate prevention)
   * @param {string} platformName - Platform name to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if platform name exists, false otherwise
   */
  async platformNameExists(platformName, excludeId = null) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${RecruitmentPlatformTableName} WHERE platformName = ?`;
      const values = [platformName];

      if (excludeId) {
        query += ' AND platformId != ?';
        values.push(excludeId);
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].count > 0;
    } catch (error) {
      console.error('RecruitmentPlatformRepository.platformNameExists error:', error);
      throw error;
    }
  }

  /**
   * Get active platform names for dropdown
   * @returns {Promise<Array>} - Array of active platform names
   */
  async getActivePlatformNames() {
    try {
      const query = `SELECT platformName FROM ${RecruitmentPlatformTableName} WHERE isActive = 1 ORDER BY platformName ASC`;
      const [rows] = await this.db.execute(query);
      return rows.map(row => row.platformName);
    } catch (error) {
      console.error('RecruitmentPlatformRepository.getActivePlatformNames error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentPlatformRepository;