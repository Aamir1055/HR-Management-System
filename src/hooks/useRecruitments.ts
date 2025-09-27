// Custom hook for managing recruitment data state and operations
// Provides centralized state management for recruitment CRUD operations with error handling
import { useState, useEffect, useCallback } from 'react';
import { Recruitment, RecruitmentFormData, RecruitmentSearchFilters } from '../types';
import recruitmentApi, { RecruitmentListResponse } from '../services/recruitmentApi';
import { useToast } from '../components/UI/ToastContainer';

export const useRecruitments = () => {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  
  const { showSuccess, showError } = useToast();

  // Fetch recruitments with filters
  const fetchRecruitments = useCallback(async (filters: RecruitmentSearchFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: RecruitmentListResponse = await recruitmentApi.getAll(filters);
      setRecruitments(response.recruitments);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Error fetching recruitments:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch recruitment records';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Load initial data
  useEffect(() => {
    fetchRecruitments();
  }, [fetchRecruitments]);

  // Refresh recruitments
  const refreshRecruitments = useCallback((filters?: RecruitmentSearchFilters) => {
    return fetchRecruitments(filters);
  }, [fetchRecruitments]);

  // Create new recruitment
  const createRecruitment = useCallback(async (data: RecruitmentFormData): Promise<Recruitment> => {
    try {
      const newRecruitment = await recruitmentApi.create(data);
      
      // Add to current list if it fits the current filters
      setRecruitments(prev => [newRecruitment, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      
      showSuccess('Success', 'Recruitment record created successfully');
      return newRecruitment;
    } catch (err: any) {
      console.error('Error creating recruitment:', err);
      const errorMessage = err.response?.data?.error || 'Failed to create recruitment record';
      
      // Handle validation errors
      if (err.response?.data?.validationErrors) {
        const validationErrors = err.response.data.validationErrors.join(', ');
        showError('Validation Error', validationErrors);
        throw new Error(validationErrors);
      }
      
      showError('Error', errorMessage);
      throw new Error(errorMessage);
    }
  }, [showSuccess, showError]);

  // Update recruitment
  const updateRecruitment = useCallback(async (id: number, data: RecruitmentFormData): Promise<Recruitment> => {
    try {
      const updatedRecruitment = await recruitmentApi.update(id, data);
      
      // Update in current list
      setRecruitments(prev => 
        prev.map(recruitment => 
          recruitment.id === id ? updatedRecruitment : recruitment
        )
      );
      
      showSuccess('Success', 'Recruitment record updated successfully');
      return updatedRecruitment;
    } catch (err: any) {
      console.error('Error updating recruitment:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update recruitment record';
      
      // Handle validation errors
      if (err.response?.data?.validationErrors) {
        const validationErrors = err.response.data.validationErrors.join(', ');
        showError('Validation Error', validationErrors);
        throw new Error(validationErrors);
      }
      
      showError('Error', errorMessage);
      throw new Error(errorMessage);
    }
  }, [showSuccess, showError]);

  // Delete recruitment
  const deleteRecruitment = useCallback(async (id: number): Promise<void> => {
    try {
      await recruitmentApi.delete(id);
      
      // Remove from current list
      setRecruitments(prev => prev.filter(recruitment => recruitment.id !== id));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      
      showSuccess('Success', 'Recruitment record deleted successfully');
    } catch (err: any) {
      console.error('Error deleting recruitment:', err);
      const errorMessage = err.response?.data?.error || 'Failed to delete recruitment record';
      showError('Error', errorMessage);
      throw new Error(errorMessage);
    }
  }, [showSuccess, showError]);

  // Get single recruitment by ID
  const getRecruitmentById = useCallback(async (id: number): Promise<Recruitment> => {
    try {
      return await recruitmentApi.getById(id);
    } catch (err: any) {
      console.error('Error fetching recruitment:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch recruitment record';
      showError('Error', errorMessage);
      throw new Error(errorMessage);
    }
  }, [showError]);

  // Download CV
  const downloadCV = useCallback(async (id: number, fileName?: string): Promise<void> => {
    try {
      const blob = await recruitmentApi.downloadCV(id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `CV_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Success', 'CV downloaded successfully');
    } catch (err: any) {
      console.error('Error downloading CV:', err);
      const errorMessage = err.response?.data?.error || 'Failed to download CV';
      showError('Error', errorMessage);
    }
  }, [showSuccess, showError]);

  // Export to Excel
  const exportToExcel = useCallback(async (filters: RecruitmentSearchFilters = {}): Promise<void> => {
    try {
      const blob = await recruitmentApi.exportToExcel(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recruitment_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Success', 'Recruitment data exported successfully');
    } catch (err: any) {
      console.error('Error exporting data:', err);
      const errorMessage = err.response?.data?.error || 'Failed to export recruitment data';
      showError('Error', errorMessage);
    }
  }, [showSuccess, showError]);

  // Search recruitments
  const searchRecruitments = useCallback(async (criteria: RecruitmentSearchFilters): Promise<Recruitment[]> => {
    try {
      return await recruitmentApi.search(criteria);
    } catch (err: any) {
      console.error('Error searching recruitments:', err);
      const errorMessage = err.response?.data?.error || 'Failed to search recruitment records';
      showError('Error', errorMessage);
      return [];
    }
  }, [showError]);

  return {
    // State
    recruitments,
    loading,
    error,
    pagination,
    
    // Actions
    fetchRecruitments,
    refreshRecruitments,
    createRecruitment,
    updateRecruitment,
    deleteRecruitment,
    getRecruitmentById,
    downloadCV,
    exportToExcel,
    searchRecruitments
  };
};

export default useRecruitments;
