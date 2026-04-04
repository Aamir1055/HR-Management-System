// Custom React hook for peticash data management with CRUD operations
// Provides centralized state management for petty cash expenses with error handling and API integration
import { useState, useEffect, useCallback } from 'react';
import { Peticash, PeticashResponse, PeticashFilters, PeticashOptions, PeticashSummary } from '../types';

export const usePeticash = () => {
  const [expenses, setExpenses] = useState<Peticash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchExpenses = useCallback(async (filters?: PeticashFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.expense_category) queryParams.append('expense_category', filters.expense_category);
      if (filters?.payable !== undefined) queryParams.append('payable', filters.payable.toString());
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`/api/peticash?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PeticashResponse = await response.json();
      setExpenses(data.expenses);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch petty cash expenses:', err);
      setError('Failed to load petty cash expenses. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addExpense = async (expense: Omit<Peticash, 'id'>) => {
    try {
      // Validate required fields
      if (!expense.date || !expense.expense_category) {
        throw new Error('Date and Expense Category are required');
      }
      
      if (!expense.authorised_amount || expense.authorised_amount <= 0) {
        throw new Error('Authorised amount must be greater than 0');
      }

      const response = await fetch('/api/peticash', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expense)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await fetchExpenses(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Failed to add petty cash expense:', err);
      throw err;
    }
  };

  const updateExpense = async (id: number, updates: Partial<Peticash>) => {
    try {
      // Validate required fields if provided
      if (updates.authorised_amount !== undefined && updates.authorised_amount <= 0) {
        throw new Error('Authorised amount must be greater than 0');
      }

      const response = await fetch(`/api/peticash/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await fetchExpenses(); // Refresh the list
      return data;
    } catch (err) {
      console.error('Failed to update petty cash expense:', err);
      throw err;
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const response = await fetch(`/api/peticash/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      await fetchExpenses(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete petty cash expense:', err);
      throw err;
    }
  };

  const fetchExpenseById = async (id: number): Promise<Peticash | null> => {
    try {
      const response = await fetch(`/api/peticash/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const fetchOptions = useCallback(async (): Promise<PeticashOptions | null> => {
    try {
      const response = await fetch('/api/peticash/options', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }, []);

  const fetchSummary = async (startDate?: string, endDate?: string): Promise<PeticashSummary | null> => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await fetch(`/api/peticash/summary?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  return {
    expenses,
    loading,
    error,
    pagination,
    fetchExpenses,
    fetchExpenseById,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchOptions,
    fetchSummary,
    refreshExpenses: fetchExpenses,
  };
};
