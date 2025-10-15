/**
 * Recruitment Service - Business Logic Layer
 * Handles business logic, validation, and file operations for recruitment data
 */

const { Recruitment, FileValidation } = require('../models/Recruitment');
const path = require('path');
const fs = require('fs').promises;

class RecruitmentService {
  constructor(recruitmentRepository) {
    this.recruitmentRepository = recruitmentRepository;
  }

  /**
   * Create a new recruitment record
   * @param {Object} recruitmentData - Recruitment data
   * @param {Object} file - Uploaded CV file (optional)
   * @returns {Promise<Object>} - Created recruitment record
   */
  async createRecruitment(recruitmentData, file = null) {
    try {
      // Create recruitment instance for validation
      const recruitment = new Recruitment(recruitmentData);
      
      // Validate the data
      const validation = recruitment.validate('create');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check if email already exists
      const existingRecruitment = await this.recruitmentRepository.findByEmail(recruitment.email);
      if (existingRecruitment) {
        throw new Error(`Email ${recruitment.email} is already registered in the recruitment system`);
      }

      // Handle file upload if provided
      if (file) {
        const fileValidation = this.validateFile(file);
        if (!fileValidation.isValid) {
          const error = new Error('File validation failed');
          error.validationErrors = fileValidation.errors;
          throw error;
        }

        // Process and save the file
        const fileData = await this.saveFile(file);
        recruitment.cvFilePath = fileData.filePath;
        recruitment.cvOriginalName = fileData.originalName;
        recruitment.cvFileSize = fileData.fileSize;
        recruitment.cvMimeType = fileData.mimeType;
      }

      // Convert to database format
      const dbData = recruitment.toDbFormat();

      // Save to database
      const savedRecruitment = await this.recruitmentRepository.create(dbData);
      
      return Recruitment.fromDbFormat(savedRecruitment);
    } catch (error) {
      console.error('RecruitmentService.createRecruitment error:', error);
      throw error;
    }
  }

  /**
   * Get all recruitment records with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Recruitment records with metadata
   */
  async getAllRecruitments(options = {}) {
    try {
      // Build query options
      const queryOptions = {
        search: options.search,
        recruitmentSource: options.recruitmentSource,
        recruitmentPipeline: options.recruitmentPipeline,
        fullName: options.fullName,
        nationality: options.nationality,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        orderBy: options.orderBy || 'createdAt',
        orderDirection: options.orderDirection || 'DESC',
        limit: options.limit ? parseInt(options.limit) : null,
        offset: options.offset ? parseInt(options.offset) : 0
      };

      // Get recruitment records and total count
      const [recruitments, totalCount] = await Promise.all([
        this.recruitmentRepository.findAll(queryOptions),
        this.recruitmentRepository.count(queryOptions)
      ]);

      // Convert to model format
      const formattedRecruitments = recruitments.map(recruitment => 
        Recruitment.fromDbFormat(recruitment)
      );

      return {
        recruitments: formattedRecruitments,
        pagination: {
          total: totalCount,
          page: Math.floor(queryOptions.offset / (queryOptions.limit || totalCount)) + 1,
          limit: queryOptions.limit,
          totalPages: queryOptions.limit ? Math.ceil(totalCount / queryOptions.limit) : 1
        }
      };
    } catch (error) {
      console.error('RecruitmentService.getAllRecruitments error:', error);
      throw error;
    }
  }

  /**
   * Get recruitment record by ID
   * @param {number} id - Recruitment ID
   * @returns {Promise<Object|null>} - Recruitment record or null
   */
  async getRecruitmentById(id) {
    try {
      const recruitment = await this.recruitmentRepository.findById(id);
      if (!recruitment) {
        return null;
      }
      
      return Recruitment.fromDbFormat(recruitment);
    } catch (error) {
      console.error('RecruitmentService.getRecruitmentById error:', error);
      throw error;
    }
  }

  /**
   * Update recruitment record
   * @param {number} id - Recruitment ID
   * @param {Object} updateData - Data to update
   * @param {Object} file - New CV file (optional)
   * @returns {Promise<Object|null>} - Updated recruitment record or null
   */
  async updateRecruitment(id, updateData, file = null) {
    try {
      // Check if recruitment exists
      const existingRecruitment = await this.recruitmentRepository.findById(id);
      if (!existingRecruitment) {
        throw new Error('Recruitment record not found');
      }

      // Create recruitment instance with updated data
      const recruitmentData = { ...existingRecruitment, ...updateData, id };
      const recruitment = new Recruitment(recruitmentData);
      
      // Validate the data
      const validation = recruitment.validate('update');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingRecruitment.email) {
        const emailExists = await this.recruitmentRepository.emailExists(updateData.email, id);
        if (emailExists) {
          throw new Error(`Email ${updateData.email} is already registered in the recruitment system`);
        }
      }

      // Handle file upload if provided
      if (file) {
        const fileValidation = this.validateFile(file);
        if (!fileValidation.isValid) {
          const error = new Error('File validation failed');
          error.validationErrors = fileValidation.errors;
          throw error;
        }

        // Delete old file if it exists
        if (existingRecruitment.cvFilePath) {
          await this.deleteFile(existingRecruitment.cvFilePath);
        }

        // Process and save the new file
        const fileData = await this.saveFile(file);
        updateData.cvFilePath = fileData.filePath;
        updateData.cvOriginalName = fileData.originalName;
        updateData.cvFileSize = fileData.fileSize;
        updateData.cvMimeType = fileData.mimeType;
      }

      // Convert to database format
      const dbData = new Recruitment(updateData).toDbFormat();

      // Update in database
      const updatedRecruitment = await this.recruitmentRepository.update(id, dbData);
      
      return Recruitment.fromDbFormat(updatedRecruitment);
    } catch (error) {
      console.error('RecruitmentService.updateRecruitment error:', error);
      throw error;
    }
  }

  /**
   * Delete recruitment record
   * @param {number} id - Recruitment ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deleteRecruitment(id) {
    try {
      // Get recruitment data to check for file
      const existingRecruitment = await this.recruitmentRepository.findById(id);
      if (!existingRecruitment) {
        return false;
      }

      // Delete associated file if it exists
      if (existingRecruitment.cvFilePath) {
        await this.deleteFile(existingRecruitment.cvFilePath);
      }

      // Delete from database
      const deleted = await this.recruitmentRepository.delete(id);
      return deleted;
    } catch (error) {
      console.error('RecruitmentService.deleteRecruitment error:', error);
      throw error;
    }
  }

  /**
   * Get recruitment statistics
   * @returns {Promise<Object>} - Statistics data
   */
  async getRecruitmentStatistics() {
    try {
      return await this.recruitmentRepository.getStatistics();
    } catch (error) {
      console.error('RecruitmentService.getRecruitmentStatistics error:', error);
      throw error;
    }
  }

  /**
   * Get recruitment records by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} - Recruitment records
   */
  async getRecruitmentsByDateRange(startDate, endDate) {
    try {
      const recruitments = await this.recruitmentRepository.findByDateRange(startDate, endDate);
      return recruitments.map(recruitment => Recruitment.fromDbFormat(recruitment));
    } catch (error) {
      console.error('RecruitmentService.getRecruitmentsByDateRange error:', error);
      throw error;
    }
  }

  /**
   * Download CV file
   * @param {number} id - Recruitment ID
   * @returns {Promise<Object>} - File information and path
   */
  async downloadCV(id) {
    try {
      const recruitment = await this.recruitmentRepository.findById(id);
      if (!recruitment || !recruitment.cvFilePath) {
        throw new Error('CV file not found');
      }

      // Check if file exists
      const fullPath = path.resolve(recruitment.cvFilePath);
      await fs.access(fullPath);

      return {
        filePath: fullPath,
        originalName: recruitment.cvOriginalName,
        mimeType: recruitment.cvMimeType,
        fileSize: recruitment.cvFileSize
      };
    } catch (error) {
      console.error('RecruitmentService.downloadCV error:', error);
      throw error;
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Validate uploaded file
   * @param {Object} file - Multer file object
   * @returns {Object} - Validation result
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > FileValidation.MAX_SIZE) {
      errors.push(`File size exceeds maximum limit of ${FileValidation.MAX_SIZE / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!FileValidation.ALLOWED_TYPES.includes(file.mimetype)) {
      errors.push('File type not allowed. Allowed types: PDF, DOC, DOCX, JPG, JPEG, PNG');
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!FileValidation.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      errors.push('File extension not allowed. Allowed extensions: .pdf, .doc, .docx, .jpg, .jpeg, .png');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Save uploaded file
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} - Saved file information
   */
  async saveFile(file) {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'cvs');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const fileName = `cv_${timestamp}_${Math.random().toString(36).substring(2)}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      return {
        filePath: filePath,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      console.error('RecruitmentService.saveFile error:', error);
      throw new Error('Failed to save file');
    }
  }

  /**
   * Delete file from disk
   * @param {string} filePath - Path to file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    try {
      if (filePath && filePath !== '') {
        const fullPath = path.resolve(filePath);
        await fs.unlink(fullPath);
        console.log('File deleted:', fullPath);
      }
    } catch (error) {
      // Don't throw error if file doesn't exist, just log it
      console.warn('Could not delete file:', filePath, error.message);
    }
  }

  /**
   * Search recruitments with advanced filtering
   * @param {Object} searchCriteria - Search criteria
   * @returns {Promise<Array>} - Matching recruitment records
   */
  async searchRecruitments(searchCriteria) {
    try {
      const options = {
        search: searchCriteria.query,
        recruitmentSource: searchCriteria.source,
        recruitmentPipeline: searchCriteria.pipeline,
        nationality: searchCriteria.nationality,
        dateFrom: searchCriteria.dateFrom,
        dateTo: searchCriteria.dateTo,
        orderBy: searchCriteria.orderBy || 'createdAt',
        orderDirection: searchCriteria.orderDirection || 'DESC'
      };

      const recruitments = await this.recruitmentRepository.findAll(options);
      return recruitments.map(recruitment => Recruitment.fromDbFormat(recruitment));
    } catch (error) {
      console.error('RecruitmentService.searchRecruitments error:', error);
      throw error;
    }
  }
}

module.exports = RecruitmentService;
