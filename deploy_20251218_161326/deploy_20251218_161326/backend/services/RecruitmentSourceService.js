/**
 * Recruitment Source Service - Business Logic Layer
 * Handles business logic and validation for recruitment source master data
 */

const { RecruitmentSource } = require('../models/RecruitmentSource');

class RecruitmentSourceService {
  constructor(sourceRepository) {
    this.sourceRepository = sourceRepository;
  }

  /**
   * Create a new recruitment source record
   * @param {Object} sourceData - Source data
   * @returns {Promise<Object>} - Created source record
   */
  async createSource(sourceData) {
    try {
      // Create source instance for validation
      const source = new RecruitmentSource(sourceData);
      
      // Validate the data
      const validation = source.validate('create');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check if source name already exists
      const existingSource = await this.sourceRepository.findByName(source.sourceName);
      if (existingSource) {
        throw new Error(`Source name '${source.sourceName}' already exists`);
      }

      // Convert to database format
      const dbData = source.toDbFormat();

      // Save to database
      const savedSource = await this.sourceRepository.create(dbData);
      
      return RecruitmentSource.fromDbFormat(savedSource);
    } catch (error) {
      console.error('RecruitmentSourceService.createSource error:', error);
      throw error;
    }
  }

  /**
   * Get all recruitment source records with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Source records with metadata
   */
  async getAllSources(options = {}) {
    try {
      // Build query options
      const queryOptions = {
        search: options.search,
        isActive: options.isActive,
        orderBy: options.orderBy || 'sourceName',
        orderDirection: options.orderDirection || 'ASC',
        limit: options.limit ? parseInt(options.limit) : null,
        offset: options.offset ? parseInt(options.offset) : 0
      };

      // Get source records and total count
      const [sources, totalCount] = await Promise.all([
        this.sourceRepository.findAll(queryOptions),
        this.sourceRepository.count(queryOptions)
      ]);

      // Convert to model format
      const formattedSources = sources.map(source => RecruitmentSource.fromDbFormat(source));

      return {
        sources: formattedSources,
        pagination: {
          total: totalCount,
          page: Math.floor(queryOptions.offset / (queryOptions.limit || totalCount)) + 1,
          limit: queryOptions.limit,
          totalPages: queryOptions.limit ? Math.ceil(totalCount / queryOptions.limit) : 1
        }
      };
    } catch (error) {
      console.error('RecruitmentSourceService.getAllSources error:', error);
      throw error;
    }
  }

  /**
   * Get recruitment source record by ID
   * @param {number} id - Source ID
   * @returns {Promise<Object|null>} - Source record or null
   */
  async getSourceById(id) {
    try {
      const source = await this.sourceRepository.findById(id);
      if (!source) {
        return null;
      }
      
      return RecruitmentSource.fromDbFormat(source);
    } catch (error) {
      console.error('RecruitmentSourceService.getSourceById error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment source record
   * @param {number} id - Source ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated source record or null
   */
  async updateSource(id, updateData) {
    try {
      // Check if source exists
      const existingSource = await this.sourceRepository.findById(id);
      if (!existingSource) {
        throw new Error('Source record not found');
      }

      // Create source instance with updated data
      const sourceData = { ...existingSource, ...updateData, sourceId: id };
      const source = new RecruitmentSource(sourceData);
      
      // Validate the data
      const validation = source.validate('update');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check source name uniqueness if source name is being updated
      if (updateData.sourceName && updateData.sourceName !== existingSource.sourceName) {
        const nameExists = await this.sourceRepository.sourceNameExists(updateData.sourceName, id);
        if (nameExists) {
          throw new Error(`Source name '${updateData.sourceName}' already exists`);
        }
      }

      // Convert to database format
      const dbData = new RecruitmentSource(updateData).toDbFormat();

      // Update in database
      const updatedSource = await this.sourceRepository.update(id, dbData);
      
      return RecruitmentSource.fromDbFormat(updatedSource);
    } catch (error) {
      console.error('RecruitmentSourceService.updateSource error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment source record
   * @param {number} id - Source ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deleteSource(id) {
    try {
      // Check if source exists
      const existingSource = await this.sourceRepository.findById(id);
      if (!existingSource) {
        return false;
      }

      // Delete from database
      const deleted = await this.sourceRepository.delete(id);
      return deleted;
    } catch (error) {
      console.error('RecruitmentSourceService.deleteSource error:', error);
      throw error;
    }
  }

  /**
   * Get all active source names for dropdown
   * @returns {Promise<Array>} - Array of active source names
   */
  async getActiveSourceNames() {
    try {
      return await this.sourceRepository.getActiveSourceNames();
    } catch (error) {
      console.error('RecruitmentSourceService.getActiveSourceNames error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentSourceService;