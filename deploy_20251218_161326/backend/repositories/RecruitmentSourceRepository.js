/**
 * Recruitment Source Repository - Data Access Layer
 * Handles all database operations for recruitment source master data
 */

const { RecruitmentSourceTableName } = require('../models/RecruitmentSource');

class RecruitmentSourceRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new recruitment source record
   * @param {Object} sourceData - Source data
   * @returns {Promise<Object>} - Created source record
   */
  async create(sourceData) {
    try {
      const fields = Object.keys(sourceData).join(', ');
      const placeholders = Object.keys(sourceData).map(() => '?').join(', ');
      const values = Object.values(sourceData);

      const query = `
        INSERT INTO ${RecruitmentSourceTableName} (${fields})
        VALUES (${placeholders})
      `;

      const [result] = await this.db.execute(query, values);
      
      // Return the created record
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('RecruitmentSourceRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Find all recruitment source records with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of source records
   */
  async findAll(options = {}) {
    try {
      let query = `SELECT * FROM ${RecruitmentSourceTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions
      if (options.search) {
        conditions.push('(sourceName LIKE ? OR description LIKE ?)');
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
      const orderBy = options.orderBy || 'sourceName';
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
      console.error('RecruitmentSourceRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment source record by ID
   * @param {number} id - Source ID
   * @returns {Promise<Object|null>} - Source record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${RecruitmentSourceTableName} WHERE sourceId = ?`;
      const [rows] = await this.db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentSourceRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment source record by name
   * @param {string} sourceName - Source name
   * @returns {Promise<Object|null>} - Source record or null
   */
  async findByName(sourceName) {
    try {
      const query = `SELECT * FROM ${RecruitmentSourceTableName} WHERE sourceName = ?`;
      const [rows] = await this.db.execute(query, [sourceName]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentSourceRepository.findByName error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment source record by ID
   * @param {number} id - Source ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated source record or null
   */
  async update(id, updateData) {
    try {
      // Remove id from updateData if it exists
      const { sourceId: _, ...dataToUpdate } = updateData;
      
      if (Object.keys(dataToUpdate).length === 0) {
        return await this.findById(id);
      }

      const fields = Object.keys(dataToUpdate).map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(dataToUpdate), id];

      const query = `
        UPDATE ${RecruitmentSourceTableName} 
        SET ${fields}, updated_at = CURRENT_TIMESTAMP 
        WHERE sourceId = ?
      `;

      const [result] = await this.db.execute(query, values);
      
      if (result.affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      console.error('RecruitmentSourceRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment source record by ID
   * @param {number} id - Source ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${RecruitmentSourceTableName} WHERE sourceId = ?`;
      const [result] = await this.db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('RecruitmentSourceRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Get count of recruitment source records with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<number>} - Count of records
   */
  async count(options = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${RecruitmentSourceTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions (same as findAll)
      if (options.search) {
        conditions.push('(sourceName LIKE ? OR description LIKE ?)');
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
      console.error('RecruitmentSourceRepository.count error:', error);
      throw error;
    }
  }

  /**
   * Check if source name already exists (for duplicate prevention)
   * @param {string} sourceName - Source name to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if source name exists, false otherwise
   */
  async sourceNameExists(sourceName, excludeId = null) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${RecruitmentSourceTableName} WHERE sourceName = ?`;
      const values = [sourceName];

      if (excludeId) {
        query += ' AND sourceId != ?';
        values.push(excludeId);
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].count > 0;
    } catch (error) {
      console.error('RecruitmentSourceRepository.sourceNameExists error:', error);
      throw error;
    }
  }

  /**
   * Get active source names for dropdown
   * @returns {Promise<Array>} - Array of active source names
   */
  async getActiveSourceNames() {
    try {
      const query = `SELECT sourceName FROM ${RecruitmentSourceTableName} WHERE isActive = 1 ORDER BY sourceName ASC`;
      const [rows] = await this.db.execute(query);
      return rows.map(row => row.sourceName);
    } catch (error) {
      console.error('RecruitmentSourceRepository.getActiveSourceNames error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentSourceRepository;