// useRoles hook - manages role state and operations
import { useState, useCallback } from 'react';
import { Role } from '../types';
import roleApi from '../services/roleApi';
import { useToast } from '../components/UI/ToastContainer';

interface UseRolesReturn {
  roles: Role[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  refreshRoles: (filters?: any) => Promise<void>;
  createRole: (roleData: any) => Promise<void>;
  updateRole: (id: number, roleData: any) => Promise<void>;
  deleteRole: (id: number) => Promise<void>;
  getRoleNames: () => Promise<string[]>;
}

export const useRoles = (): UseRolesReturn => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const { showSuccess, showError } = useToast();

  // Refresh roles with optional filters
  const refreshRoles = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await roleApi.getRoles(filters);
      
      setRoles(response.roles);
      setPagination(response.pagination);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch roles';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Create new role
  const createRole = useCallback(async (roleData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const newRole = await roleApi.createRole(roleData);
      
      // Add to current list if it fits the current filters
      setRoles(prevRoles => [newRole, ...prevRoles]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      
      showSuccess('Success', 'Role created successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create role';
      setError(errorMessage);
      showError('Error', errorMessage);
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // Update existing role
  const updateRole = useCallback(async (id: number, roleData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedRole = await roleApi.updateRole(id, roleData);
      
      // Update in current list
      setRoles(prevRoles => 
        prevRoles.map(role => 
          role.roleId === id ? updatedRole : role
        )
      );
      
      showSuccess('Success', 'Role updated successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update role';
      setError(errorMessage);
      showError('Error', errorMessage);
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // Delete role
  const deleteRole = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      await roleApi.deleteRole(id);
      
      // Remove from current list
      setRoles(prevRoles => prevRoles.filter(role => role.roleId !== id));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      
      showSuccess('Success', 'Role deleted successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete role';
      setError(errorMessage);
      showError('Error', errorMessage);
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError]);

  // Get role names for dropdown
  const getRoleNames = useCallback(async (): Promise<string[]> => {
    try {
      return await roleApi.getRoleNames();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch role names';
      showError('Error', errorMessage);
      return [];
    }
  }, [showError]);

  return {
    roles,
    loading,
    error,
    pagination,
    refreshRoles,
    createRole,
    updateRole,
    deleteRole,
    getRoleNames,
  };
};