/**
 * Role Data Model
 * Defines the role master data structure and database schema mappings
 */

const RoleSchema = {
  roleId: { type: 'number', required: false, autoIncrement: true },
  roleName: { type: 'string', required: true, maxLength: 100, unique: true },
  created_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP' },
  updated_at: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
};

const RoleTableName = 'roles';

// Required fields for different operations
const RequiredFields = {
  create: ['roleName'],
  update: ['roleId'],
  search: []
};

class Role {
  constructor(data = {}) {
    Object.keys(RoleSchema).forEach(field => {
      const schema = RoleSchema[field];
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

  // Validate role data against schema
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
    if (this.roleName && this.roleName.length > 100) {
      errors.push('Role name must be 100 characters or less');
    }

    // Validate role name format (basic validation)
    if (this.roleName && !/^[a-zA-Z0-9\s\-&().,]+$/.test(this.roleName)) {
      errors.push('Role name contains invalid characters');
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
    return new Role(dbData);
  }

  // Sanitize for JSON response
  toJSON() {
    return { ...this };
  }
}

module.exports = {
  Role,
  RoleSchema,
  RoleTableName,
  RequiredFields
};