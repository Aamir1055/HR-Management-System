import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useOffices } from '../../hooks/useOffices';
import { useEmployees } from '../../hooks/useEmployees';
import PositionOfficeSelection from './PositionOfficeSelection';

interface MasterDataFormProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  dataType: 'office' | 'position' | 'visaType' | 'platform' | 'loan' | 'role' | 'recruitmentSource' | 'recruitmentPipeline' | 'recruitmentPlatform';
  data: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
  updateItem?: (id: number, data: any) => Promise<any>;
  createItem?: (data: any) => Promise<any>;
  loading?: boolean;
}

const MasterDataForm: React.FC<MasterDataFormProps> = ({ 
  isOpen, 
  mode, 
  dataType, 
  data, 
  onSubmit, 
  onClose,
  updateItem,
  createItem,
  loading: externalLoading = false
}) => {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const { offices, loading: officesLoading, error: officesError } = useOffices();
  const { employees, loading: employeesLoading, error: employeesError } = useEmployees();

  // ✅ FIX: Add missing state declarations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ REMOVED: recordAsPayment state since we removed adjustment fields

  const watchedOffice = watch('office_name');
  const watchedEmployeeId = watch('employee_id');

  useEffect(() => {
    if (data) {
      const formData = { ...data };
      
      // Map position_name to title for position forms
      if (dataType === 'position' && data.position_name && !data.title) {
        formData.title = data.position_name;
      }
      
      // Format dates for loan forms - HTML date inputs expect YYYY-MM-DD format
      if (dataType === 'loan' && formData.start_date) {
        const dateValue = new Date(formData.start_date);
        if (!isNaN(dateValue.getTime())) {
          const year = dateValue.getFullYear();
          const month = String(dateValue.getMonth() + 1).padStart(2, '0');
          const day = String(dateValue.getDate()).padStart(2, '0');
          formData.start_date = `${year}-${month}-${day}`;
        }
      }
      
      // ✅ SIMPLIFIED: Only format basic loan values, no adjustment amounts
      if (dataType === 'loan') {
        formData.total_amount = parseFloat(formData.total_amount || 0);
        formData.total_loan_amount = parseFloat(formData.total_loan_amount || 0);
        formData.remaining_amount = parseFloat(formData.remaining_amount || 0);
      }
      
      reset(formData);
    } else {
      reset({});
    }
  }, [data, reset, dataType]);

  if (!isOpen) return null;

  const titles = {
    office: 'Office',
    position: 'Position',
    visaType: 'Visa Type',
    platform: 'Platform',
    loan: 'Employee Loan',
    role: 'Role',
    recruitmentSource: 'Recruitment Source',
    recruitmentPipeline: 'Recruitment Pipeline',
    recruitmentPlatform: 'Recruitment Platform'
  };

  // ✅ SIMPLIFIED: Basic form submission without auto-deduction processing
  const onFormSubmit = async (formData: any) => {
    console.log('📤 Form submit triggered');
    console.log('📝 Form data:', formData);
    console.log('✏️ Current data:', data);
    
    setLoading(true);
    setError(null);

    try {
      if (mode === 'edit' && data) {
        console.log(`🔄 Attempting to update ${dataType} with ID:`, data.id);
        console.log('📋 Update payload:', formData);

        if (updateItem) {
          await updateItem(data.id, formData);
        } else {
          await onSubmit(formData);
        }
      } else {
        // Create new item
        console.log(`➕ Creating new ${dataType}`);
        if (createItem) {
          await createItem(formData);
        } else {
          await onSubmit(formData);
        }
      }

      console.log('✅ Operation completed successfully');
      onClose();
      
    } catch (err: any) {
      console.error('❌ Form submission error:', err);
      console.error('📊 Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      const errorMessage = err.message || 'Failed to save data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (dataType) {
      case 'office':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="office_name" className="block text-sm font-medium text-gray-700">
                Office Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="office_name"
                {...register('office_name', { required: 'Office name is required' })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.office_name && (
                <p className="mt-1 text-sm text-red-600">{errors.office_name.message as string}</p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                id="location"
                {...register('location')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </>
        );

      case 'position':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Position Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: mode !== 'view' ? 'Position name is required' : false })}
                disabled={mode === 'view'}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message as string}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Optional position description..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              ></textarea>
            </div>

            {/* Enhanced Multiple Office Selection with Checkboxes */}
            {mode === 'add' ? (
              <PositionOfficeSelection 
                offices={offices}
                officesLoading={officesLoading}
                disabled={mode === 'view'}
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
              />
            ) : (
              // For edit/view mode, show single office (legacy support)
              <>
                <div className="mb-4">
                  <label htmlFor="office_name" className="block text-sm font-medium text-gray-700">
                    Office <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="office_name"
                    {...register('office_name', { required: mode !== 'view' ? 'Office selection is required' : false })}
                    disabled={mode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">Select an office</option>
                    {offices && offices.map((office: any) => (
                      <option key={office.office_id} value={office.office_name}>{office.office_name}</option>
                    ))}
                  </select>
                  {errors.office_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.office_name.message as string}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label htmlFor="reporting_time" className="block text-sm font-medium text-gray-700">
                    Reporting Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="reporting_time"
                    {...register('reporting_time', { required: mode !== 'view' ? 'Reporting time is required' : false })}
                    disabled={mode === 'view'}
                    defaultValue="09:00"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  />
                  {errors.reporting_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.reporting_time.message as string}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label htmlFor="duty_hours" className="block text-sm font-medium text-gray-700">
                    Duty Hours <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="duty_hours"
                    step="0.25"
                    min="0"
                    max="24"
                    {...register('duty_hours', { required: mode !== 'view' ? 'Duty hours is required' : false })}
                    disabled={mode === 'view'}
                    defaultValue="8.00"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  />
                  {errors.duty_hours && (
                    <p className="mt-1 text-sm text-red-600">{errors.duty_hours.message as string}</p>
                  )}
                </div>
              </>
            )}
          </>
        );

      case 'visaType':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="typeofvisa" className="block text-sm font-medium text-gray-700">
                Visa Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="typeofvisa"
                {...register('typeofvisa', { required: 'Visa type is required' })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.typeofvisa && (
                <p className="mt-1 text-sm text-red-600">{errors.typeofvisa.message as string}</p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              ></textarea>
            </div>
          </>
        );

      case 'platform':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="platform_name" className="block text-sm font-medium text-gray-700">
                Platform Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="platform_name"
                {...register('platform_name', { required: 'Platform name is required' })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.platform_name && (
                <p className="mt-1 text-sm text-red-600">{errors.platform_name.message as string}</p>
              )}
            </div>
          </>
        );

      case 'loan':
        return (
          <>
            {/* Employee ID Field */}
            <div className="mb-4">
              <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="employee_id"
                {...register('employee_id', { required: 'Employee ID is required' })}
                disabled={mode === 'view'}
                placeholder="Enter Employee ID (e.g., EMP-001)"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.employee_id && (
                <p className="mt-1 text-sm text-red-600">{errors.employee_id.message as string}</p>
              )}
            </div>

            {/* Loan Title */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Loan Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: mode !== 'view' ? 'Loan title is required' : false })}
                disabled={mode === 'view'}
                placeholder="e.g., Personal Loan, Car Loan, etc."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message as string}</p>
              )}
            </div>

            {/* ✅ UPDATED: Changed label to "Loan Amount" for simplicity */}
            <div className="mb-4">
              <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700">
                Loan Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="total_amount"
                step="0.01"
                min="0"
                {...register('total_amount', { 
                  required: mode !== 'view' ? 'Loan amount is required' : false,
                  min: { value: 0, message: 'Amount must be positive' }
                })}
                disabled={mode === 'view'}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.total_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.total_amount.message as string}</p>
              )}
            </div>

            {/* ❌ REMOVED: Amount Added and Amount Deducted fields from edit mode */}
            {/* These are now handled in EmployeeLoanHistory.tsx with separate buttons */}


            {/* Start Date */}
            <div className="mb-4">
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                Disbursed Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="start_date"
                {...register('start_date', { required: mode !== 'view' ? 'Disbursed date is required' : false })}
                disabled={mode === 'view'}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message as string}</p>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                {...register('description')}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Optional loan description..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              ></textarea>
            </div>

          </>
        );

      case 'role':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="roleName" className="block text-sm font-medium text-gray-700">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="roleName"
                {...register('roleName', { 
                  required: mode !== 'view' ? 'Role name is required' : false,
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
                disabled={mode === 'view'}
                placeholder="Enter role name"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.roleName && (
                <p className="mt-1 text-sm text-red-600">{errors.roleName.message as string}</p>
              )}
            </div>
          </>
        );

      case 'recruitmentSource':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="sourceName" className="block text-sm font-medium text-gray-700">
                Source Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="sourceName"
                {...register('sourceName', { 
                  required: mode !== 'view' ? 'Source name is required' : false,
                  minLength: {
                    value: 2,
                    message: 'Source name must be at least 2 characters'
                  },
                  maxLength: {
                    value: 100,
                    message: 'Source name must be 100 characters or less'
                  }
                })}
                disabled={mode === 'view'}
                placeholder="Enter recruitment source name"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.sourceName && (
                <p className="mt-1 text-sm text-red-600">{errors.sourceName.message as string}</p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Optional description..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              ></textarea>
            </div>
          </>
        );

      case 'recruitmentPipeline':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="pipelineName" className="block text-sm font-medium text-gray-700">
                Pipeline Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="pipelineName"
                {...register('pipelineName', { 
                  required: mode !== 'view' ? 'Pipeline name is required' : false,
                  minLength: {
                    value: 2,
                    message: 'Pipeline name must be at least 2 characters'
                  },
                  maxLength: {
                    value: 100,
                    message: 'Pipeline name must be 100 characters or less'
                  }
                })}
                disabled={mode === 'view'}
                placeholder="Enter pipeline stage name"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.pipelineName && (
                <p className="mt-1 text-sm text-red-600">{errors.pipelineName.message as string}</p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="stageOrder" className="block text-sm font-medium text-gray-700">
                Stage Order
              </label>
              <input
                type="number"
                id="stageOrder"
                min="0"
                max="999"
                {...register('stageOrder')}
                disabled={mode === 'view'}
                placeholder="Enter stage order (0-999)"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Optional description..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              ></textarea>
            </div>
          </>
        );

      case 'recruitmentPlatform':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="platformName" className="block text-sm font-medium text-gray-700">
                Platform Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="platformName"
                {...register('platformName', { 
                  required: mode !== 'view' ? 'Platform name is required' : false,
                  minLength: {
                    value: 2,
                    message: 'Platform name must be at least 2 characters'
                  },
                  maxLength: {
                    value: 100,
                    message: 'Platform name must be 100 characters or less'
                  }
                })}
                disabled={mode === 'view'}
                placeholder="Enter platform name"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
              {errors.platformName && (
                <p className="mt-1 text-sm text-red-600">{errors.platformName.message as string}</p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                disabled={mode === 'view'}
                rows={3}
                placeholder="Optional description..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              ></textarea>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const isFormLoading = loading || externalLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'add' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} {titles[dataType]}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6">
          {renderFormFields()}
          
          {/* ❌ REMOVED: Record as payment checkbox since we removed adjustment fields */}
          
          {/* Error display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isFormLoading}
            >
              Cancel
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                disabled={isFormLoading}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isFormLoading && (
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isFormLoading ? 'Processing...' : `${mode === 'add' ? 'Create' : 'Update'} ${titles[dataType]}`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterDataForm;
