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
  const createUser = async (_userData: any) => {
    // Not yet implemented server-side; prevent accidental calls to /roles
    throw new Error('User creation is not available yet. Listing and office visibility are enabled.');
  };

  // Update existing user
  const updateUser = async (_id: number, _userData: any) => {
    // Not yet implemented server-side; prevent accidental calls to /roles
    throw new Error('User update is not available yet.');
  };

  // Delete user
  const deleteUser = async (_id: number) => {
    // Not yet implemented server-side; prevent accidental calls to /roles
    throw new Error('User deletion is not available yet.');
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
