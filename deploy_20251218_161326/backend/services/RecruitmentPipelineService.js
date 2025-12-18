/**
 * Recruitment Pipeline Service - Business Logic Layer
 * Handles business logic and validation for recruitment pipeline master data
 */

const { RecruitmentPipeline } = require('../models/RecruitmentPipeline');

class RecruitmentPipelineService {
  constructor(pipelineRepository) {
    this.pipelineRepository = pipelineRepository;
  }

  /**
   * Create a new recruitment pipeline record
   * @param {Object} pipelineData - Pipeline data
   * @returns {Promise<Object>} - Created pipeline record
   */
  async createPipeline(pipelineData) {
    try {
      // Create pipeline instance for validation
      const pipeline = new RecruitmentPipeline(pipelineData);
      
      // Validate the data
      const validation = pipeline.validate('create');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check if pipeline name already exists
      const existingPipeline = await this.pipelineRepository.findByName(pipeline.pipelineName);
      if (existingPipeline) {
        throw new Error(`Pipeline name '${pipeline.pipelineName}' already exists`);
      }

      // Convert to database format
      const dbData = pipeline.toDbFormat();

      // Save to database
      const savedPipeline = await this.pipelineRepository.create(dbData);
      
      return RecruitmentPipeline.fromDbFormat(savedPipeline);
    } catch (error) {
      console.error('RecruitmentPipelineService.createPipeline error:', error);
      throw error;
    }
  }

  /**
   * Get all recruitment pipeline records with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Pipeline records with metadata
   */
  async getAllPipelines(options = {}) {
    try {
      // Build query options
      const queryOptions = {
        search: options.search,
        isActive: options.isActive,
        orderBy: options.orderBy || 'stageOrder, pipelineName',
        orderDirection: options.orderDirection || 'ASC',
        limit: options.limit ? parseInt(options.limit) : null,
        offset: options.offset ? parseInt(options.offset) : 0
      };

      // Get pipeline records and total count
      const [pipelines, totalCount] = await Promise.all([
        this.pipelineRepository.findAll(queryOptions),
        this.pipelineRepository.count(queryOptions)
      ]);

      // Convert to model format
      const formattedPipelines = pipelines.map(pipeline => RecruitmentPipeline.fromDbFormat(pipeline));

      return {
        pipelines: formattedPipelines,
        pagination: {
          total: totalCount,
          page: Math.floor(queryOptions.offset / (queryOptions.limit || totalCount)) + 1,
          limit: queryOptions.limit,
          totalPages: queryOptions.limit ? Math.ceil(totalCount / queryOptions.limit) : 1
        }
      };
    } catch (error) {
      console.error('RecruitmentPipelineService.getAllPipelines error:', error);
      throw error;
    }
  }

  /**
   * Get recruitment pipeline record by ID
   * @param {number} id - Pipeline ID
   * @returns {Promise<Object|null>} - Pipeline record or null
   */
  async getPipelineById(id) {
    try {
      const pipeline = await this.pipelineRepository.findById(id);
      if (!pipeline) {
        return null;
      }
      
      return RecruitmentPipeline.fromDbFormat(pipeline);
    } catch (error) {
      console.error('RecruitmentPipelineService.getPipelineById error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment pipeline record
   * @param {number} id - Pipeline ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated pipeline record or null
   */
  async updatePipeline(id, updateData) {
    try {
      // Check if pipeline exists
      const existingPipeline = await this.pipelineRepository.findById(id);
      if (!existingPipeline) {
        throw new Error('Pipeline record not found');
      }

      // Create pipeline instance with updated data
      const pipelineData = { ...existingPipeline, ...updateData, pipelineId: id };
      const pipeline = new RecruitmentPipeline(pipelineData);
      
      // Validate the data
      const validation = pipeline.validate('update');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check pipeline name uniqueness if pipeline name is being updated
      if (updateData.pipelineName && updateData.pipelineName !== existingPipeline.pipelineName) {
        const nameExists = await this.pipelineRepository.pipelineNameExists(updateData.pipelineName, id);
        if (nameExists) {
          throw new Error(`Pipeline name '${updateData.pipelineName}' already exists`);
        }
      }

      // Convert to database format
      const dbData = new RecruitmentPipeline(updateData).toDbFormat();

      // Update in database
      const updatedPipeline = await this.pipelineRepository.update(id, dbData);
      
      return RecruitmentPipeline.fromDbFormat(updatedPipeline);
    } catch (error) {
      console.error('RecruitmentPipelineService.updatePipeline error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment pipeline record
   * @param {number} id - Pipeline ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deletePipeline(id) {
    try {
      // Check if pipeline exists
      const existingPipeline = await this.pipelineRepository.findById(id);
      if (!existingPipeline) {
        return false;
      }

      // Delete from database
      const deleted = await this.pipelineRepository.delete(id);
      return deleted;
    } catch (error) {
      console.error('RecruitmentPipelineService.deletePipeline error:', error);
      throw error;
    }
  }

  /**
   * Get all active pipeline names for dropdown (ordered by stage order)
   * @returns {Promise<Array>} - Array of active pipeline names
   */
  async getActivePipelineNames() {
    try {
      return await this.pipelineRepository.getActivePipelineNames();
    } catch (error) {
      console.error('RecruitmentPipelineService.getActivePipelineNames error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentPipelineService;