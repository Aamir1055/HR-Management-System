// Role API service - handles all role-related API calls
import { Role } from '../types';

const API_BASE_URL = '/api/roles';

interface RoleResponse {
  roles: Role[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface RoleNamesResponse {
  roleNames: string[];
}

const roleApi = {
  // Get all roles with optional filtering and pagination
  async getRoles(params?: {
    search?: string;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<RoleResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params?.orderDirection) queryParams.append('orderDirection', params.orderDirection);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = queryParams.toString() ? `${API_BASE_URL}?${queryParams}` : API_BASE_URL;
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch roles');
    }
    
    return response.json();
  },

  // Get role by ID
  async getRoleById(id: number): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch role');
    }
    
    return response.json();
  },

  // Create new role
  async createRole(roleData: Omit<Role, 'roleId' | 'created_at' | 'updated_at'>): Promise<Role> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create role');
    }

    const result = await response.json();
    return result.role;
  },

  // Update role
  async updateRole(id: number, roleData: Partial<Omit<Role, 'roleId' | 'created_at' | 'updated_at'>>): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update role');
    }

    const result = await response.json();
    return result.role;
  },

  // Delete role
  async deleteRole(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete role');
    }
  },

  // Get role names for dropdown
  async getRoleNames(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/names`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch role names');
    }
    
    const result: RoleNamesResponse = await response.json();
    return result.roleNames;
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; module: string; database: string; totalRecords: number }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Health check failed');
    }
    
    return response.json();
  }
};

export default roleApi;