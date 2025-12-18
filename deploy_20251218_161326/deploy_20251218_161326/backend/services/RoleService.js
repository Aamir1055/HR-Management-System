/**
 * Role Service - Business Logic Layer
 * Handles business logic and validation for user role data
 */

const { UserRole } = require('../models/UserRole');

class RoleService {
  constructor(roleRepository) {
    this.roleRepository = roleRepository;
  }

  /**
   * Create a new role record
   * @param {Object} roleData - Role data
   * @returns {Promise<Object>} - Created role record
   */
  async createRole(roleData) {
    try {
      // Create role instance for validation
      const role = new UserRole(roleData);
      
      // Validate the data
      const validation = role.validate('create');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check if role name already exists
      const existingRole = await this.roleRepository.findByName(role.name);
      if (existingRole) {
        throw new Error(`Role name '${role.name}' already exists`);
      }

      // Convert to database format
      const dbData = role.toDbFormat();

      // Save to database
      const savedRole = await this.roleRepository.create(dbData);
      
      return UserRole.fromDbFormat(savedRole);
    } catch (error) {
      console.error('RoleService.createRole error:', error);
      throw error;
    }
  }

  /**
   * Get all role records with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Role records with metadata
   */
  async getAllRoles(options = {}) {
    try {
      // Build query options
      const queryOptions = {
        search: options.search,
        orderBy: options.orderBy || 'name',
        orderDirection: options.orderDirection || 'ASC',
        limit: options.limit ? parseInt(options.limit) : null,
        offset: options.offset ? parseInt(options.offset) : 0
      };

      // Get role records and total count
      const [roles, totalCount] = await Promise.all([
        this.roleRepository.findAll(queryOptions),
        this.roleRepository.count(queryOptions)
      ]);

      // Convert to model format
      const formattedRoles = roles.map(role => UserRole.fromDbFormat(role));

      return {
        roles: formattedRoles,
        pagination: {
          total: totalCount,
          page: Math.floor(queryOptions.offset / (queryOptions.limit || totalCount)) + 1,
          limit: queryOptions.limit,
          totalPages: queryOptions.limit ? Math.ceil(totalCount / queryOptions.limit) : 1
        }
      };
    } catch (error) {
      console.error('RoleService.getAllRoles error:', error);
      throw error;
    }
  }

  /**
   * Get role record by ID
   * @param {number} id - Role ID
   * @returns {Promise<Object|null>} - Role record or null
   */
  async getRoleById(id) {
    try {
      const role = await this.roleRepository.findById(id);
      if (!role) {
        return null;
      }
      
      return UserRole.fromDbFormat(role);
    } catch (error) {
      console.error('RoleService.getRoleById error:', error);
      throw error;
    }
  }

  /**
   * Update role record
   * @param {number} id - Role ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated role record or null
   */
  async updateRole(id, updateData) {
    try {
      // Check if role exists
      const existingRole = await this.roleRepository.findById(id);
      if (!existingRole) {
        throw new Error('Role record not found');
      }

      // Create role instance with updated data
      const roleData = { ...existingRole, ...updateData, id: id };
      const role = new UserRole(roleData);
      
      // Validate the data
      const validation = role.validate('update');
      if (!validation.isValid) {
        const error = new Error('Validation failed');
        error.validationErrors = validation.errors;
        error.validationWarnings = validation.warnings;
        throw error;
      }

      // Check role name uniqueness if role name is being updated
      if (updateData.name && updateData.name !== existingRole.name) {
        const nameExists = await this.roleRepository.roleNameExists(updateData.name, id);
        if (nameExists) {
          throw new Error(`Role name '${updateData.name}' already exists`);
        }
      }

      // Convert to database format
      const dbData = new UserRole(updateData).toDbFormat();

      // Update in database
      const updatedRole = await this.roleRepository.update(id, dbData);
      
      return UserRole.fromDbFormat(updatedRole);
    } catch (error) {
      console.error('RoleService.updateRole error:', error);
      throw error;
    }
  }

  /**
   * Delete role record
   * @param {number} id - Role ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deleteRole(id) {
    try {
      // Check if role exists
      const existingRole = await this.roleRepository.findById(id);
      if (!existingRole) {
        return false;
      }

      // Delete from database
      const deleted = await this.roleRepository.delete(id);
      return deleted;
    } catch (error) {
      console.error('RoleService.deleteRole error:', error);
      throw error;
    }
  }

  /**
   * Get all role names for dropdown
   * @returns {Promise<Array>} - Array of role names
   */
  async getRoleNames() {
    try {
      const result = await this.getAllRoles({ orderBy: 'name', orderDirection: 'ASC' });
      return result.roles.map(role => role.name);
    } catch (error) {
      console.error('RoleService.getRoleNames error:', error);
      throw error;
    }
  }
}

module.exports = RoleService;