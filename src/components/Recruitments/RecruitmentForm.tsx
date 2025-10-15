// RecruitmentForm component - handles creation and editing of recruitment records
// Includes form validation, file upload, and UI that matches the EmployeeForm styling
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar, Upload, FileText, Download, Trash2 } from 'lucide-react';
import { Recruitment, RecruitmentFormData } from '../../types';
import recruitmentApi from '../../services/recruitmentApi';
import roleApi from '../../services/roleApi';
import { useToast } from '../UI/ToastContainer';

interface RecruitmentFormProps {
  recruitment?: Recruitment;
  onSubmit?: (data: RecruitmentFormData) => Promise<void>;
  onClose: () => void;
  fullPage?: boolean;
}

const RecruitmentForm: React.FC<RecruitmentFormProps> = ({
  recruitment,
  onSubmit,
  onClose,
  fullPage = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFile, setExistingFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  
  const { showSuccess, showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RecruitmentFormData>({
    defaultValues: {
      date: new Date().toLocaleDateString('en-GB'), // dd/mm/yyyy format
      fullName: '',
      mobile: '',
      whatsapp: '',
      email: '',
      recruitmentSource: '',
      recruitmentPipeline: '',
      comments: '',
    },
  });

  // Load recruitment data and role names on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load role names for dropdown
        const roles = await roleApi.getRoleNames();
        setRoleNames(roles);

        if (recruitment) {
          // Format date for input
          const formattedDate = recruitment.formattedDate || recruitment.date;
          
          reset({
            ...recruitment,
            date: formattedDate,
          });
          
          // Set existing file info if available
          if (recruitment.cvOriginalName) {
            setExistingFile({
              name: recruitment.cvOriginalName,
              size: recruitment.cvFileSize || 0
            });
          }
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        showError('Error', 'Failed to load form data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [recruitment, reset, showError]);

  // Handle file validation and processing
  const processFile = (file: File) => {
    if (!file) return false;

    console.log('Selected file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    setIsUploading(true);

    // Validate file size (15MB)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('File Error', 'File size must be less than 15MB');
      setIsUploading(false);
      return false;
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    // Validate file type by both MIME type and extension
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      // Some systems might not recognize all MIME types, so we also check by extension
      'application/octet-stream' // Fallback for unrecognized types
    ];

    const hasValidMimeType = allowedMimeTypes.includes(file.type);
    
    if (!hasValidMimeType && !hasValidExtension) {
      showError('File Error', 'Please select a PDF, DOC, DOCX, JPG, JPEG, or PNG file');
      setIsUploading(false);
      return false;
    }

    setSelectedFile(file);
    setExistingFile(null); // Clear existing file when new file is selected
    setIsUploading(false);
    showSuccess('File Selected', `${file.name} selected successfully`);
    return true;
  };

  // Handle file selection from input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const success = processFile(file);
      if (!success) {
        event.target.value = '';
      }
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('cvFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Download existing CV
  const downloadExistingCV = async () => {
    if (!recruitment?.id) return;
    
    try {
      const blob = await recruitmentApi.downloadCV(recruitment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = existingFile?.name || `CV_${recruitment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Success', 'CV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CV:', error);
      showError('Error', 'Failed to download CV');
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle form submission
  const onFormSubmit = async (data: RecruitmentFormData) => {
    try {
      // Add file to form data if selected
      if (selectedFile) {
        data.cvFile = selectedFile;
      }

      // Call parent onSubmit if provided
      if (onSubmit) {
        await onSubmit(data);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      // Error handling is done in the parent component through useRecruitments hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formContent = (
    <>
      <style>
        {`
          /* Ensure dropdowns open downward */
          select {
            appearance: menulist !important;
            -webkit-appearance: menulist !important;
            -moz-appearance: menulist !important;
          }
          
          /* Force dropdown direction */
          .dropdown-container {
            position: relative;
            z-index: 1;
          }
          
          .dropdown-container select {
            position: relative;
            z-index: 2;
          }
        `}
      </style>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Application Date *
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="DD/MM/YYYY"
            {...register('date', {
              required: 'Date is required',
              pattern: {
                value: /^\d{2}\/\d{2}\/\d{4}$/,
                message: 'Date must be in DD/MM/YYYY format'
              }
            })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
        )}
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          {...register('fullName', { required: 'Full name is required' })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      {/* Mobile & WhatsApp */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number *
          </label>
          <input
            type="tel"
            {...register('mobile', { required: 'Mobile number is required' })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.mobile && (
            <p className="mt-1 text-sm text-red-600">{errors.mobile.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Number
          </label>
          <input
            type="tel"
            {...register('whatsapp')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address'
            }
          })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Recruitment Source & Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="dropdown-container">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recruitment Source *
          </label>
          <select
            {...register('recruitmentSource', { required: 'Recruitment source is required' })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select recruitment source</option>
            <option value="Indeed">Indeed</option>
            <option value="Candidate Reference">Candidate Reference</option>
            <option value="Employee Reference">Employee Reference</option>
            <option value="Walk-In">Walk-In</option>
          </select>
          {errors.recruitmentSource && (
            <p className="mt-1 text-sm text-red-600">{errors.recruitmentSource.message}</p>
          )}
        </div>
        <div className="dropdown-container">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recruitment Pipeline *
          </label>
          <select
            {...register('recruitmentPipeline', { required: 'Recruitment pipeline is required' })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select pipeline stage</option>
            <option value="HR Screening">HR Screening</option>
            <option value="Screening Reject">Screening Reject</option>
            <option value="R1">R1</option>
            <option value="R1 Reject">R1 Reject</option>
            <option value="R2">R2</option>
            <option value="R2 Reject">R2 Reject</option>
            <option value="Offered">Offered</option>
            <option value="Onboarded">Onboarded</option>
          </select>
          {errors.recruitmentPipeline && (
            <p className="mt-1 text-sm text-red-600">{errors.recruitmentPipeline.message}</p>
          )}
        </div>
      </div>

      {/* Platform & Role */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform
          </label>
          <div className="dropdown-container">
            <select
              {...register('platform')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select platform</option>
              <option value="National Stock Exchange">National Stock Exchange</option>
              <option value="Forex">Forex</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <div className="dropdown-container">
            <select
              {...register('role')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select role</option>
              {roleNames.map((roleName) => (
                <option key={roleName} value={roleName}>
                  {roleName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comments
        </label>
        <textarea
          {...register('comments')}
          rows={3}
          placeholder="Add any additional comments or notes about the candidate..."
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-vertical"
        />
        {errors.comments && (
          <p className="mt-1 text-sm text-red-600">{errors.comments.message}</p>
        )}
      </div>

      {/* CV Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload CV (Max 15MB)
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="cvFile"
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : isUploading
                  ? 'border-gray-300 bg-gray-100'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                ) : (
                  <Upload className={`w-8 h-8 mb-2 ${
                    isDragOver ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                )}
                <p className="mb-2 text-sm text-gray-500">
                  {isUploading ? (
                    <span>Processing file...</span>
                  ) : isDragOver ? (
                    <span className="font-semibold text-blue-600">Drop file here</span>
                  ) : (
                    <><span className="font-semibold">Click to upload</span> or drag and drop</>
                  )}
                </p>
                {!isUploading && (
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, JPEG, PNG (MAX 15MB)</p>
                )}
              </div>
              <input
                id="cvFile"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
          
          {/* Selected file display */}
          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-xs text-blue-600">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Existing CV display (view mode or edit with existing file) */}
      {existingFile && !selectedFile && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current CV
          </label>
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-900">{existingFile.name}</p>
                <p className="text-xs text-green-600">{formatFileSize(existingFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadExistingCV}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </button>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : recruitment ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
    </>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {recruitment ? 'Edit' : 'Add'} Recruitment Record
                </h1>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {formContent}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {recruitment ? 'Edit' : 'Add'} Recruitment Record
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {formContent}
      </div>
    </div>
  );
};

export default RecruitmentForm;
