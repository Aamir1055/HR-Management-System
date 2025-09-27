// Recruitment API service - handles all recruitment-related API calls
// Provides functions for CRUD operations, file upload/download, and data fetching
import { api } from './api';
import { 
  Recruitment, 
  RecruitmentFormData, 
  RecruitmentSearchFilters, 
  RecruitmentStatistics, 
  RecruitmentReferenceData 
} from '../types';

export interface RecruitmentListResponse {
  recruitments: Recruitment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const recruitmentApi = {
  // === CRUD Operations ===

  /**
   * Get all recruitment records with optional filtering and pagination
   */
  async getAll(filters: RecruitmentSearchFilters = {}): Promise<RecruitmentListResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.source) params.append('source', filters.source);
    if (filters.pipeline) params.append('pipeline', filters.pipeline);
    if (filters.nationality) params.append('nationality', filters.nationality);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.orderBy) params.append('orderBy', filters.orderBy);
    if (filters.orderDirection) params.append('orderDirection', filters.orderDirection);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await api.get(`/recruitment?${params.toString()}`);
    return response.data;
  },

  /**
   * Get recruitment record by ID
   */
  async getById(id: number): Promise<Recruitment> {
    const response = await api.get(`/recruitment/${id}`);
    return response.data;
  },

  /**
   * Create new recruitment record
   */
  async create(data: RecruitmentFormData): Promise<Recruitment> {
    const formData = new FormData();
    
    // Add all recruitment fields
    Object.keys(data).forEach(key => {
      if (key === 'cvFile') {
        if (data.cvFile) {
          formData.append('cv', data.cvFile);
        }
      } else {
        const value = data[key as keyof RecruitmentFormData];
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
    });

    const response = await api.post('/recruitment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.recruitment;
  },

  /**
   * Update recruitment record
   */
  async update(id: number, data: RecruitmentFormData): Promise<Recruitment> {
    const formData = new FormData();
    
    // Add all recruitment fields
    Object.keys(data).forEach(key => {
      if (key === 'cvFile') {
        if (data.cvFile) {
          formData.append('cv', data.cvFile);
        }
      } else {
        const value = data[key as keyof RecruitmentFormData];
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
    });

    const response = await api.put(`/recruitment/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.recruitment;
  },

  /**
   * Delete recruitment record
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/recruitment/${id}`);
  },

  // === Reference Data ===

  /**
   * Get all reference data (sources, pipelines, nationalities)
   */
  async getReferenceData(): Promise<RecruitmentReferenceData> {
    const response = await api.get('/recruitment/reference-data');
    return response.data;
  },

  /**
   * Get recruitment sources
   */
  async getSources(): Promise<string[]> {
    const response = await api.get('/recruitment/sources');
    return response.data.sources;
  },

  /**
   * Get recruitment pipelines
   */
  async getPipelines(): Promise<string[]> {
    const response = await api.get('/recruitment/pipelines');
    return response.data.pipelines;
  },

  /**
   * Get nationalities
   */
  async getNationalities(): Promise<string[]> {
    const response = await api.get('/recruitment/nationalities');
    return response.data.nationalities;
  },

  // === Statistics ===

  /**
   * Get recruitment statistics
   */
  async getStatistics(): Promise<RecruitmentStatistics> {
    const response = await api.get('/recruitment/statistics');
    return response.data;
  },

  // === Search and Reports ===

  /**
   * Advanced search for recruitment records
   */
  async search(criteria: RecruitmentSearchFilters): Promise<Recruitment[]> {
    const response = await api.post('/recruitment/search', criteria);
    return response.data.recruitments;
  },

  /**
   * Get recruitment records by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<Recruitment[]> {
    const response = await api.get(`/recruitment/date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data.recruitments;
  },

  // === File Operations ===

  /**
   * Download CV file
   */
  async downloadCV(id: number): Promise<Blob> {
    const response = await api.get(`/recruitment/${id}/cv/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Export recruitment data to Excel
   */
  async exportToExcel(filters: RecruitmentSearchFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.source) params.append('source', filters.source);
    if (filters.pipeline) params.append('pipeline', filters.pipeline);
    if (filters.nationality) params.append('nationality', filters.nationality);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await api.get(`/recruitment/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // === Health Check ===

  /**
   * Health check for recruitment module
   */
  async healthCheck(): Promise<{ status: string; database: string; totalRecords: number }> {
    const response = await api.get('/recruitment/health');
    return response.data;
  }
};

export default recruitmentApi;
