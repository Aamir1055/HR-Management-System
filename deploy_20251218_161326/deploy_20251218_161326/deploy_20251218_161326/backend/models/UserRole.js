/**
 * User Role Data Model
 * Defines the user role data structure for system access control
 */

const UserRoleSchema = {
  id: { type: 'number', required: false, autoIncrement: true },
  name: { type: 'string', required: true, maxLength: 100, unique: true },
  description: { type: 'string', required: false, maxLength: 500 },
  isActive: { type: 'boolean', required: false, default: true },
  created_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP' },
  updated_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
};

const UserRoleTableName = 'user_roles';

// Required fields for different operations
const RequiredFields = {
  create: ['name'],
  update: ['id'],
  search: []
};

class UserRole {
  constructor(data = {}) {
    Object.keys(UserRoleSchema).forEach(field => {
      const schema = UserRoleSchema[field];
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

  // Validate user role data against schema
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

    // Validate role name length
    if (this.name && this.name.length > 100) {
      errors.push('Role name must be 100 characters or less');
    }

    // Validate role name format (basic validation)
    if (this.name && !/^[a-zA-Z0-9_\-\s]+$/.test(this.name)) {
      errors.push('Role name contains invalid characters');
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
    return new UserRole(dbData);
  }

  // Sanitize for JSON response
  toJSON() {
    return { ...this };
  }
}

module.exports = {
  UserRole,
  UserRoleSchema,
  UserRoleTableName,
  RequiredFields
};