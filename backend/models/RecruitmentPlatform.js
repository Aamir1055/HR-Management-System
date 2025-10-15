/**
 * Recruitment Platform Data Model
 * Defines the recruitment platform master data structure and database schema mappings
 */

const RecruitmentPlatformSchema = {
  platformId: { type: 'number', required: false, autoIncrement: true },
  platformName: { type: 'string', required: true, maxLength: 100, unique: true },
  description: { type: 'string', required: false, maxLength: 500 },
  isActive: { type: 'boolean', required: false, default: true },
  created_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP' },
  updated_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
};

const RecruitmentPlatformTableName = 'recruitment_platforms';

// Required fields for different operations
const RequiredFields = {
  create: ['platformName'],
  update: ['platformId'],
  search: []
};

class RecruitmentPlatform {
  constructor(data = {}) {
    Object.keys(RecruitmentPlatformSchema).forEach(field => {
      const schema = RecruitmentPlatformSchema[field];
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

  // Validate recruitment platform data against schema
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

    // Validate platform name length
    if (this.platformName && this.platformName.length > 100) {
      errors.push('Platform name must be 100 characters or less');
    }

    // Validate platform name format (basic validation)
    if (this.platformName && !/^[a-zA-Z0-9\s\-&().,]+$/.test(this.platformName)) {
      errors.push('Platform name contains invalid characters');
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
    return new RecruitmentPlatform(dbData);
  }

  // Sanitize for JSON response
  toJSON() {
    return { ...this };
  }
}

module.exports = {
  RecruitmentPlatform,
  RecruitmentPlatformSchema,
  RecruitmentPlatformTableName,
  RequiredFields
};