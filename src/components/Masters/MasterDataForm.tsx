
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useOffices } from '../../hooks/useOffices';
import { useEmployees } from '../../hooks/useEmployees';

interface MasterDataFormProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  dataType: 'office' | 'position' | 'visaType' | 'platform' | 'loan';
  data: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const MasterDataForm: React.FC<MasterDataFormProps> = ({ isOpen, mode, dataType, data, onSubmit, onClose }) => {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  // Only fetch offices for position forms
  const { offices, loading: officesLoading, error: officesError } = useOffices();
  const { employees, loading: employeesLoading, error: employeesError } = useEmployees();
  const watchedOffice = watch('office_name');
  const watchedEmployeeId = watch('employee_id');
  

  useEffect(() => {
    if (data) {
      // Map position_name to title for position forms
      const formData = { ...data };
      if (dataType === 'position' && data.position_name && !data.title) {
        formData.title = data.position_name;
      }
      
      // Format dates for loan forms - HTML date inputs expect YYYY-MM-DD format
      if (dataType === 'loan' && formData.start_date) {
        // Convert date to YYYY-MM-DD format without timezone conversion
        const dateValue = new Date(formData.start_date);
        if (!isNaN(dateValue.getTime())) {
          // Use local date to avoid timezone issues
          const year = dateValue.getFullYear();
          const month = String(dateValue.getMonth() + 1).padStart(2, '0');
          const day = String(dateValue.getDate()).padStart(2, '0');
          formData.start_date = `${year}-${month}-${day}`;
        }
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
    loan: 'Employee Loan'
  };

  const renderFormFields = () => {
    switch (dataType) {
      case 'office':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="office_name" className="block text-sm font-medium text-gray-700">Office Name</label>
              <input
                type="text"
                id="office_name"
                {...register('office_name', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
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
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Position Name</label>
              <input
                type="text"
                id="title"
                {...register('title', { required: mode !== 'view' })}
                disabled={mode === 'view'}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="office_name" className="block text-sm font-medium text-gray-700">Office</label>
              <select
                id="office_name"
                {...register('office_name', { required: mode !== 'view' })}
                disabled={mode === 'view'}
                value={watchedOffice || ''}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              >
                <option value="">Select an office</option>
                {offices && offices.map((office: any) => (
                  <option key={office.office_id} value={office.office_name}>{office.office_name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="reporting_time" className="block text-sm font-medium text-gray-700">Reporting Time</label>
              <input
                type="time"
                id="reporting_time"
                {...register('reporting_time', { required: mode !== 'view' })}
                disabled={mode === 'view'}
                defaultValue="09:00"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="duty_hours" className="block text-sm font-medium text-gray-700">Duty Hours</label>
              <input
                type="number"
                id="duty_hours"
                step="0.25"
                min="0"
                max="24"
                {...register('duty_hours', { required: mode !== 'view' })}
                disabled={mode === 'view'}
                defaultValue="8.00"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>
          </>
        );
      case 'visaType':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="typeofvisa" className="block text-sm font-medium text-gray-700">Visa Type</label>
              <input
                type="text"
                id="typeofvisa"
                {...register('typeofvisa', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
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
              <label htmlFor="platform_name" className="block text-sm font-medium text-gray-700">Platform Name</label>
              <input
                type="text"
                id="platform_name"
                {...register('platform_name', { required: true })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </>
        );
      case 'loan':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700">Employee ID</label>
              <input
                type="text"
                id="employee_id"
                {...register('employee_id', { required: mode !== 'view' })}
                disabled={mode === 'view'}
                placeholder="Enter Employee ID (e.g., EMP-001)"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Loan Title</label>
              <input
                type="text"
                id="title"
                {...register('title', { required: mode !== 'view' })}
                disabled={mode === 'view'}
                placeholder="e.g., Personal Loan, Car Loan, etc."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700">Total Amount (AED)</label>
                <input
                  type="number"
                  id="total_amount"
                  step="0.01"
                  min="0"
                  {...register('total_amount', { required: mode !== 'view' })}
                  disabled={mode === 'view'}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label htmlFor="monthly_deduction" className="block text-sm font-medium text-gray-700">Monthly Deduction (AED)</label>
                <input
                  type="number"
                  id="monthly_deduction"
                  step="0.01"
                  min="0"
                  {...register('monthly_deduction', { required: mode !== 'view' })}
                  disabled={mode === 'view'}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                id="start_date"
                {...register('start_date', { required: mode !== 'view' })}
                disabled={mode === 'view'}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
              />
            </div>
            {mode === 'edit' && (
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="status"
                  {...register('status')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
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
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'add' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} {titles[dataType]}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {renderFormFields()}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Save
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterDataForm;

