/**
 * Recruitment Platform Service - Business Logic Layer
 * Handles business logic and validation for recruitment platform master data
 */

const { RecruitmentPlatform } = require('../models/RecruitmentPlatform');

class RecruitmentPlatformService {
  constructor(platformRepository) {
    this.platformRepository = platformRepository;
  }

  /**
   * Create a new recruitment platform record
   * @param {Object} platformData - Platform data
   * @returns {Promise<Object>} - Created platform record
   */
  async createPlatform(platformData) {
    try {
      // Create platform instance for validation
      const platform = new RecruitmentPlatform(platformData);
      
      // Validate the data
      const validation = platform.validate('create');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check if platform name already exists
      const existingPlatform = await this.platformRepository.findByName(platform.platformName);
      if (existingPlatform) {
        throw new Error(`Platform name '${platform.platformName}' already exists`);
      }

      // Convert to database format
      const dbData = platform.toDbFormat();

      // Save to database
      const savedPlatform = await this.platformRepository.create(dbData);
      
      return RecruitmentPlatform.fromDbFormat(savedPlatform);
    } catch (error) {
      console.error('RecruitmentPlatformService.createPlatform error:', error);
      throw error;
    }
  }

  /**
   * Get all recruitment platform records with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Platform records with metadata
   */
  async getAllPlatforms(options = {}) {
    try {
      // Build query options
      const queryOptions = {
        search: options.search,
        isActive: options.isActive,
        orderBy: options.orderBy || 'platformName',
        orderDirection: options.orderDirection || 'ASC',
        limit: options.limit ? parseInt(options.limit) : null,
        offset: options.offset ? parseInt(options.offset) : 0
      };

      // Get platform records and total count
      const [platforms, totalCount] = await Promise.all([
        this.platformRepository.findAll(queryOptions),
        this.platformRepository.count(queryOptions)
      ]);

      // Convert to model format
      const formattedPlatforms = platforms.map(platform => RecruitmentPlatform.fromDbFormat(platform));

      return {
        platforms: formattedPlatforms,
        pagination: {
          total: totalCount,
          page: Math.floor(queryOptions.offset / (queryOptions.limit || totalCount)) + 1,
          limit: queryOptions.limit,
          totalPages: queryOptions.limit ? Math.ceil(totalCount / queryOptions.limit) : 1
        }
      };
    } catch (error) {
      console.error('RecruitmentPlatformService.getAllPlatforms error:', error);
      throw error;
    }
  }

  /**
   * Get recruitment platform record by ID
   * @param {number} id - Platform ID
   * @returns {Promise<Object|null>} - Platform record or null
   */
  async getPlatformById(id) {
    try {
      const platform = await this.platformRepository.findById(id);
      if (!platform) {
        return null;
      }
      
      return RecruitmentPlatform.fromDbFormat(platform);
    } catch (error) {
      console.error('RecruitmentPlatformService.getPlatformById error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment platform record
   * @param {number} id - Platform ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated platform record or null
   */
  async updatePlatform(id, updateData) {
    try {
      // Check if platform exists
      const existingPlatform = await this.platformRepository.findById(id);
      if (!existingPlatform) {
        throw new Error('Platform record not found');
      }

      // Create platform instance with updated data
      const platformData = { ...existingPlatform, ...updateData, platformId: id };
      const platform = new RecruitmentPlatform(platformData);
      
      // Validate the data
      const validation = platform.validate('update');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check platform name uniqueness if platform name is being updated
      if (updateData.platformName && updateData.platformName !== existingPlatform.platformName) {
        const nameExists = await this.platformRepository.platformNameExists(updateData.platformName, id);
        if (nameExists) {
          throw new Error(`Platform name '${updateData.platformName}' already exists`);
        }
      }

      // Convert to database format
      const dbData = new RecruitmentPlatform(updateData).toDbFormat();

      // Update in database
      const updatedPlatform = await this.platformRepository.update(id, dbData);
      
      return RecruitmentPlatform.fromDbFormat(updatedPlatform);
    } catch (error) {
      console.error('RecruitmentPlatformService.updatePlatform error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment platform record
   * @param {number} id - Platform ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deletePlatform(id) {
    try {
      // Check if platform exists
      const existingPlatform = await this.platformRepository.findById(id);
      if (!existingPlatform) {
        return false;
      }

      // Delete from database
      const deleted = await this.platformRepository.delete(id);
      return deleted;
    } catch (error) {
      console.error('RecruitmentPlatformService.deletePlatform error:', error);
      throw error;
    }
  }

  /**
   * Get all active platform names for dropdown
   * @returns {Promise<Array>} - Array of active platform names
   */
  async getActivePlatformNames() {
    try {
      return await this.platformRepository.getActivePlatformNames();
    } catch (error) {
      console.error('RecruitmentPlatformService.getActivePlatformNames error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentPlatformService;