/**
 * Recruitment Repository - Data Access Layer
 * Handles all database operations for recruitment data
 */

const { RecruitmentTableName } = require('../models/Recruitment');

class RecruitmentRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new recruitment record
   * @param {Object} recruitmentData - Recruitment data
   * @returns {Promise<Object>} - Created recruitment record
   */
  async create(recruitmentData) {
    try {
      const fields = Object.keys(recruitmentData).join(', ');
      const placeholders = Object.keys(recruitmentData).map(() => '?').join(', ');
      const values = Object.values(recruitmentData);

      const query = `
        INSERT INTO ${RecruitmentTableName} (${fields})
        VALUES (${placeholders})
      `;

      const [result] = await this.db.execute(query, values);
      
      // Return the created record
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('RecruitmentRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Find all recruitment records with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of recruitment records
   */
  async findAll(options = {}) {
    try {
      let query = `SELECT * FROM ${RecruitmentTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions
      if (options.search) {
        conditions.push(`
          (fullName LIKE ? OR email LIKE ? OR mobile LIKE ? OR 
           recruitmentSource LIKE ? OR recruitmentPipeline LIKE ? OR 
           nationality LIKE ?)
        `);
        const searchTerm = `%${options.search}%`;
        values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (options.recruitmentSource) {
        conditions.push('recruitmentSource = ?');
        values.push(options.recruitmentSource);
      }

      if (options.recruitmentPipeline) {
        conditions.push('recruitmentPipeline = ?');
        values.push(options.recruitmentPipeline);
      }

      if (options.nationality) {
        conditions.push('nationality = ?');
        values.push(options.nationality);
      }

      if (options.dateFrom) {
        conditions.push('date >= ?');
        values.push(options.dateFrom);
      }

      if (options.dateTo) {
        conditions.push('date <= ?');
        values.push(options.dateTo);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ORDER BY
      const orderBy = options.orderBy || 'createdAt';
      const orderDirection = options.orderDirection || 'DESC';
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query += ` LIMIT ${parseInt(options.limit)} OFFSET ${parseInt(offset)}`;
      }

      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      console.error('RecruitmentRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment record by ID
   * @param {number} id - Recruitment ID
   * @returns {Promise<Object|null>} - Recruitment record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${RecruitmentTableName} WHERE id = ?`;
      const [rows] = await this.db.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find recruitment record by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} - Recruitment record or null
   */
  async findByEmail(email) {
    try {
      const query = `SELECT * FROM ${RecruitmentTableName} WHERE email = ?`;
      const [rows] = await this.db.execute(query, [email]);
      return rows[0] || null;
    } catch (error) {
      console.error('RecruitmentRepository.findByEmail error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment record by ID
   * @param {number} id - Recruitment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated recruitment record or null
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
        UPDATE ${RecruitmentTableName} 
        SET ${fields}, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      const [result] = await this.db.execute(query, values);
      
      if (result.affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      console.error('RecruitmentRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment record by ID
   * @param {number} id - Recruitment ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${RecruitmentTableName} WHERE id = ?`;
      const [result] = await this.db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('RecruitmentRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Get count of recruitment records with optional filtering
   * @param {Object} options - Query options
   * @returns {Promise<number>} - Count of records
   */
  async count(options = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${RecruitmentTableName}`;
      const conditions = [];
      const values = [];

      // Build WHERE conditions (same as findAll)
      if (options.search) {
        conditions.push(`
          (fullName LIKE ? OR email LIKE ? OR mobile LIKE ? OR 
           recruitmentSource LIKE ? OR recruitmentPipeline LIKE ? OR 
           nationality LIKE ?)
        `);
        const searchTerm = `%${options.search}%`;
        values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (options.recruitmentSource) {
        conditions.push('recruitmentSource = ?');
        values.push(options.recruitmentSource);
      }

      if (options.recruitmentPipeline) {
        conditions.push('recruitmentPipeline = ?');
        values.push(options.recruitmentPipeline);
      }

      if (options.nationality) {
        conditions.push('nationality = ?');
        values.push(options.nationality);
      }

      if (options.dateFrom) {
        conditions.push('date >= ?');
        values.push(options.dateFrom);
      }

      if (options.dateTo) {
        conditions.push('date <= ?');
        values.push(options.dateTo);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].total;
    } catch (error) {
      console.error('RecruitmentRepository.count error:', error);
      throw error;
    }
  }

  /**
   * Get statistics for recruitment dashboard
   * @returns {Promise<Object>} - Statistics object
   */
  async getStatistics() {
    try {
      const queries = {
        total: `SELECT COUNT(*) as count FROM ${RecruitmentTableName}`,
        bySource: `
          SELECT recruitmentSource, COUNT(*) as count 
          FROM ${RecruitmentTableName} 
          GROUP BY recruitmentSource 
          ORDER BY count DESC
        `,
        byPipeline: `
          SELECT recruitmentPipeline, COUNT(*) as count 
          FROM ${RecruitmentTableName} 
          GROUP BY recruitmentPipeline 
          ORDER BY count DESC
        `,
        byNationality: `
          SELECT nationality, COUNT(*) as count 
          FROM ${RecruitmentTableName} 
          GROUP BY nationality 
          ORDER BY count DESC 
          LIMIT 10
        `,
        recentApplications: `
          SELECT COUNT(*) as count 
          FROM ${RecruitmentTableName} 
          WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `,
        thisMonth: `
          SELECT COUNT(*) as count 
          FROM ${RecruitmentTableName} 
          WHERE YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())
        `
      };

      const [totalResult] = await this.db.execute(queries.total);
      const [bySourceResult] = await this.db.execute(queries.bySource);
      const [byPipelineResult] = await this.db.execute(queries.byPipeline);
      const [byNationalityResult] = await this.db.execute(queries.byNationality);
      const [recentResult] = await this.db.execute(queries.recentApplications);
      const [thisMonthResult] = await this.db.execute(queries.thisMonth);

      return {
        total: totalResult[0].count,
        bySource: bySourceResult,
        byPipeline: byPipelineResult,
        byNationality: byNationalityResult,
        recentApplications: recentResult[0].count,
        thisMonth: thisMonthResult[0].count
      };
    } catch (error) {
      console.error('RecruitmentRepository.getStatistics error:', error);
      throw error;
    }
  }

  /**
   * Check if email already exists (for duplicate prevention)
   * @param {string} email - Email to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if email exists, false otherwise
   */
  async emailExists(email, excludeId = null) {
    try {
      let query = `SELECT COUNT(*) as count FROM ${RecruitmentTableName} WHERE email = ?`;
      const values = [email];

      if (excludeId) {
        query += ' AND id != ?';
        values.push(excludeId);
      }

      const [rows] = await this.db.execute(query, values);
      return rows[0].count > 0;
    } catch (error) {
      console.error('RecruitmentRepository.emailExists error:', error);
      throw error;
    }
  }

  /**
   * Get recruitment records by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Array of recruitment records
   */
  async findByDateRange(startDate, endDate) {
    try {
      const query = `
        SELECT * FROM ${RecruitmentTableName} 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date DESC
      `;
      const [rows] = await this.db.execute(query, [startDate, endDate]);
      return rows;
    } catch (error) {
      console.error('RecruitmentRepository.findByDateRange error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentRepository;
