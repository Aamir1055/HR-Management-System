/**
 * Recruitment Pipeline Repository - Data Access Layer
 * Handles all database operations for recruitment pipeline master data
 */

const { RecruitmentPipelineTableName } = require('../models/RecruitmentPipeline');

class RecruitmentPipelineRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new recruitment pipeline record
   * @param {Object} pipelineData - Pipeline data
   * @returns {Promise<Object>} - Created pipeline record
   */
  async create(pipelineData) {
    try {
      const fields = Object.keys(pipelineData).join(', ');
      const placeholders = Object.keys(pipelineData).map(() => '?').join(', ');
      const values = Object.values(pipelineData);

      const query = `
        INSERT INTO ${RecruitmentPipelineTableName} (${fields})
        VALUES (${placeholders})
      `;

      const [result] = await this.db.execute(query, values);
      
      // Return the created record
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('RecruitmentPipelineRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Find all recruitment pipeline records with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of pipeline records
   */
  async findAll(options = {}) {
    try {
      let query = `SELECT * FROM ${RecruitmentPipelineTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions
      if (options.search) {
        conditions.push('(pipelineName LIKE ? OR description LIKE ?)');
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

      // Add ORDER BY - default to stage order, then name
      const orderBy = options.orderBy || 'stageOrder, pipelineName';
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
      console.error('RecruitmentPipelineRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment pipeline record by ID
   * @param {number} id - Pipeline ID
   * @returns {Promise<Object|null>} - Pipeline record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${RecruitmentPipelineTableName} WHERE pipelineId = ?`;
      const [rows] = await this.db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentPipelineRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment pipeline record by name
   * @param {string} pipelineName - Pipeline name
   * @returns {Promise<Object|null>} - Pipeline record or null
   */
  async findByName(pipelineName) {
    try {
      const query = `SELECT * FROM ${RecruitmentPipelineTableName} WHERE pipelineName = ?`;
      const [rows] = await this.db.execute(query, [pipelineName]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentPipelineRepository.findByName error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment pipeline record by ID
   * @param {number} id - Pipeline ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated pipeline record or null
   */
  async update(id, updateData) {
    try {
      // Remove id from updateData if it exists
      const { pipelineId: _, ...dataToUpdate } = updateData;
      
      if (Object.keys(dataToUpdate).length === 0) {
        return await this.findById(id);
      }

      const fields = Object.keys(dataToUpdate).map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(dataToUpdate), id];

      const query = `
        UPDATE ${RecruitmentPipelineTableName} 
        SET ${fields}, updated_at = CURRENT_TIMESTAMP 
        WHERE pipelineId = ?
      `;

      const [result] = await this.db.execute(query, values);
      
      if (result.affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      console.error('RecruitmentPipelineRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment pipeline record by ID
   * @param {number} id - Pipeline ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${RecruitmentPipelineTableName} WHERE pipelineId = ?`;
      const [result] = await this.db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('RecruitmentPipelineRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Get count of recruitment pipeline records with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<number>} - Count of records
   */
  async count(options = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${RecruitmentPipelineTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions (same as findAll)
      if (options.search) {
        conditions.push('(pipelineName LIKE ? OR description LIKE ?)');
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
      console.error('RecruitmentPipelineRepository.count error:', error);
      throw error;
    }
  }

  /**
   * Check if pipeline name already exists (for duplicate prevention)
   * @param {string} pipelineName - Pipeline name to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if pipeline name exists, false otherwise
   */
  async pipelineNameExists(pipelineName, excludeId = null) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${RecruitmentPipelineTableName} WHERE pipelineName = ?`;
      const values = [pipelineName];

      if (excludeId) {
        query += ' AND pipelineId != ?';
        values.push(excludeId);
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].count > 0;
    } catch (error) {
      console.error('RecruitmentPipelineRepository.pipelineNameExists error:', error);
      throw error;
    }
  }

  /**
   * Get active pipeline names for dropdown (ordered by stage order)
   * @returns {Promise<Array>} - Array of active pipeline names
   */
  async getActivePipelineNames() {
    try {
      const query = `SELECT pipelineName FROM ${RecruitmentPipelineTableName} WHERE isActive = 1 ORDER BY stageOrder ASC, pipelineName ASC`;
      const [rows] = await this.db.execute(query);
      return rows.map(row => row.pipelineName);
    } catch (error) {
      console.error('RecruitmentPipelineRepository.getActivePipelineNames error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentPipelineRepository;