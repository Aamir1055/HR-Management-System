/**
 * Recruitment Pipeline Data Model
 * Defines the recruitment pipeline master data structure and database schema mappings
 */

const RecruitmentPipelineSchema = {
  pipelineId: { type: 'number', required: false, autoIncrement: true },
  pipelineName: { type: 'string', required: true, maxLength: 100, unique: true },
  description: { type: 'string', required: false, maxLength: 500 },
  stageOrder: { type: 'number', required: false, default: 0 },
  isActive: { type: 'boolean', required: false, default: true },
  created_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP' },
  updated_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
};

const RecruitmentPipelineTableName = 'recruitment_pipelines';

// Required fields for different operations
const RequiredFields = {
  create: ['pipelineName'],
  update: ['pipelineId'],
  search: []
};

class RecruitmentPipeline {
  constructor(data = {}) {
    Object.keys(RecruitmentPipelineSchema).forEach(field => {
      const schema = RecruitmentPipelineSchema[field];
      // Don't set default values for timestamps - let MySQL handle them
      if (field === 'created_at' || field === 'updated_at') {
        if (data[field] !== undefined) {
          this[field] = data[field];
        }
      } else {
        this[field] = data[field] !== undefined ? data[field] : schema.default;
      }
    });
  }

  // Validate recruitment pipeline data against schema
  validate(operation = 'create') {
    const errors = [];
    const warnings = [];
    const requiredFields = RequiredFields[operation] || RequiredFields.create;

    // Check required fields
    requiredFields.forEach(field => {
      if (!this[field] || (typeof this[field] === 'string' && this[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    });

    // Validate pipeline name length
    if (this.pipelineName && this.pipelineName.length > 100) {
      errors.push('Pipeline name must be 100 characters or less');
    }

    // Validate pipeline name format (basic validation)
    if (this.pipelineName && !/^[a-zA-Z0-9\s\-&().,]+$/.test(this.pipelineName)) {
      errors.push('Pipeline name contains invalid characters');
    }

    // Validate description length
    if (this.description && this.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    // Validate stage order
    if (this.stageOrder !== undefined && (this.stageOrder < 0 || this.stageOrder > 999)) {
      errors.push('Stage order must be between 0 and 999');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Convert to database format
  toDbFormat() {
    const dbData = { ...this };
    
    // Remove undefined fields
    Object.keys(dbData).forEach(key => {
      if (dbData[key] === undefined) {
        delete dbData[key];
      }
    });

    return dbData;
  }

  // Convert from database format
  static fromDbFormat(dbData) {
    if (!dbData) return null;
    return new RecruitmentPipeline(dbData);
  }

  // Sanitize for JSON response
  toJSON() {
    return { ...this };
  }
}

module.exports = {
  RecruitmentPipeline,
  RecruitmentPipelineSchema,
  RecruitmentPipelineTableName,
  RequiredFields
};