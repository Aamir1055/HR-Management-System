import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../pages/RoleManagement';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  createUser: (userData: any) => Promise<void>;
  updateUser: (id: number, userData: any) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
}

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the dedicated users endpoint which returns { users, total }
      const response = await api.get('/users');
      const usersData = response.data?.users || [];

      // Normalize office IDs to strings to match UI types
      const normalized = (Array.isArray(usersData) ? usersData : []).map((u: any) => ({
        ...u,
        offices: Array.isArray(u.offices)
          ? u.offices.map((o: any) => ({
              id: String(o.id),
              name: o.name,
              location: o.location,
            }))
          : [],
      }));

      setUsers(normalized);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const createUser = async (userData: any) => {
    try {
      const response = await api.post('/users', userData);
      await fetchUsers(); // Refresh the user list
      return response.data;
    } catch (err: any) {
      console.error('Error creating user:', err);
      throw err; // Re-throw to be handled by the caller
    }
  };

  // Update existing user
  const updateUser = async (id: number, userData: any) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      await fetchUsers(); // Refresh the user list
      return response.data;
    } catch (err: any) {
      console.error('Error updating user:', err);
      throw err; // Re-throw to be handled by the caller
    }
  };

  // Delete user
  const deleteUser = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      // Refresh the user list after deletion
      await fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      throw new Error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  // Refresh users (public method)
  const refreshUsers = async () => {
    await fetchUsers();
  };

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refreshUsers,
    createUser,
    updateUser,
    deleteUser
  };
};
