// RoleForm component - handles creation and editing of role records
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Role } from '../../types';
import { useToast } from '../UI/ToastContainer';

interface RoleFormProps {
  role?: Role;
  onSubmit?: (data: RoleFormData) => Promise<void>;
  onClose: () => void;
  fullPage?: boolean;
}

interface RoleFormData {
  roleName: string;
}

const RoleForm: React.FC<RoleFormProps> = ({
  role,
  onSubmit,
  onClose,
  fullPage = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const { showSuccess, showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RoleFormData>({
    defaultValues: {
      roleName: '',
    },
  });

  // Load role data on mount
  useEffect(() => {
    if (role) {
      reset({
        roleName: role.roleName,
      });
    }
  }, [role, reset]);

  // Handle form submission
  const onFormSubmit = async (data: RoleFormData) => {
    try {
      setIsLoading(true);
      
      // Call parent onSubmit if provided
      if (onSubmit) {
        await onSubmit(data);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      showError('Error', error.message || 'Failed to save role');
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Role Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role Name *
        </label>
        <input
          type="text"
          {...register('roleName', { 
            required: 'Role name is required',
            minLength: {
              value: 2,
              message: 'Role name must be at least 2 characters'
            },
            maxLength: {
              value: 100,
              message: 'Role name must be 100 characters or less'
            },
            pattern: {
              value: /^[a-zA-Z0-9\s\-&().,]+$/,
              message: 'Role name contains invalid characters'
            }
          })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter role name"
        />
        {errors.roleName && (
          <p className="mt-1 text-sm text-red-600">{errors.roleName.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting || isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting || isLoading ? 'Saving...' : role ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {role ? 'Edit' : 'Add'} Role
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
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {role ? 'Edit' : 'Add'} Role
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {formContent}
      </div>
    </div>
  );
};

export default RoleForm;