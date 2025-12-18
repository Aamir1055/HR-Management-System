/**
 * Recruitment Source Data Model
 * Defines the recruitment source master data structure and database schema mappings
 */

const RecruitmentSourceSchema = {
  sourceId: { type: 'number', required: false, autoIncrement: true },
  sourceName: { type: 'string', required: true, maxLength: 100, unique: true },
  description: { type: 'string', required: false, maxLength: 500 },
  isActive: { type: 'boolean', required: false, default: true },
  created_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP' },
  updated_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
};

const RecruitmentSourceTableName = 'recruitment_sources';

// Required fields for different operations
const RequiredFields = {
  create: ['sourceName'],
  update: ['sourceId'],
  search: []
};

class RecruitmentSource {
  constructor(data = {}) {
    Object.keys(RecruitmentSourceSchema).forEach(field => {
      const schema = RecruitmentSourceSchema[field];
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

  // Validate recruitment source data against schema
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

    // Validate source name length
    if (this.sourceName && this.sourceName.length > 100) {
      errors.push('Source name must be 100 characters or less');
    }

    // Validate source name format (basic validation)
    if (this.sourceName && !/^[a-zA-Z0-9\s\-&().,]+$/.test(this.sourceName)) {
      errors.push('Source name contains invalid characters');
    }

    // Validate description length
    if (this.description && this.description.length > 500) {
      errors.push('Description must be 500 characters or less');
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
    return new RecruitmentSource(dbData);
  }

  // Sanitize for JSON response
  toJSON() {
    return { ...this };
  }
}

module.exports = {
  RecruitmentSource,
  RecruitmentSourceSchema,
  RecruitmentSourceTableName,
  RequiredFields
};