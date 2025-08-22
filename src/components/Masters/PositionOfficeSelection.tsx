import React, { useState, useEffect } from 'react';
import { useMasterData } from '../../hooks/useMasterData';

interface OfficeSelectionData {
  office_id: number;
  office_name: string;
  reporting_time: string;
  duty_hours: number;
  selected: boolean;
}

interface PositionOfficeSelectionProps {
  offices: any[];
  officesLoading: boolean;
  disabled: boolean;
  register: any;
  setValue: any;
  watch: any;
  errors: any;
}

const PositionOfficeSelection: React.FC<PositionOfficeSelectionProps> = ({
  offices,
  officesLoading,
  disabled,
  register,
  setValue,
  watch,
  errors
}) => {
  const [selectedOffices, setSelectedOffices] = useState<OfficeSelectionData[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { data: positions } = useMasterData('position');
  const watchedTitle = watch('title');

  // Initialize offices with default values
  useEffect(() => {
    if (offices && offices.length > 0) {
      const officeData: OfficeSelectionData[] = offices.map(office => ({
        office_id: office.office_id,
        office_name: office.office_name,
        reporting_time: '09:00',
        duty_hours: 8.0,
        selected: false
      }));
      setSelectedOffices(officeData);
    }
  }, [offices]);

  // Register the offices array with react-hook-form
  useEffect(() => {
    const selectedOfficesData = selectedOffices
      .filter(office => office.selected)
      .map(office => ({
        office_id: office.office_id,
        reporting_time: office.reporting_time,
        duty_hours: office.duty_hours
      }));
    
    setValue('offices', selectedOfficesData);
  }, [selectedOffices, setValue]);

  // Validation function to check for duplicate positions with same reporting time
  const validateDuplicatePositions = (positionTitle: string, selectedOfficesData: any[]) => {
    if (!positionTitle || !positions || selectedOfficesData.length === 0) {
      return null;
    }

    const duplicateOffices: string[] = [];
    
    selectedOfficesData.forEach(selectedOffice => {
      const existingPosition = positions.find(pos => 
        pos.title?.toLowerCase() === positionTitle.toLowerCase() && 
        pos.office_id === selectedOffice.office_id &&
        pos.reporting_time === selectedOffice.reporting_time
      );
      
      if (existingPosition) {
        const officeName = offices.find(off => off.office_id === selectedOffice.office_id)?.office_name || `Office ${selectedOffice.office_id}`;
        duplicateOffices.push(`${officeName} (${selectedOffice.reporting_time})`);
      }
    });

    return duplicateOffices.length > 0 
      ? `Position "${positionTitle}" with same reporting time already exists in: ${duplicateOffices.join(', ')}`
      : null;
  };

  // Run validation when title or selected offices change
  useEffect(() => {
    const selectedOfficesData = selectedOffices
      .filter(office => office.selected)
      .map(office => ({
        office_id: office.office_id,
        reporting_time: office.reporting_time,
        duty_hours: office.duty_hours
      }));
    
    const error = validateDuplicatePositions(watchedTitle, selectedOfficesData);
    setValidationError(error);
  }, [watchedTitle, selectedOffices, positions, offices]);

  const handleOfficeToggle = (officeId: number) => {
    setSelectedOffices(prev => 
      prev.map(office => 
        office.office_id === officeId 
          ? { ...office, selected: !office.selected }
          : office
      )
    );
  };

  const handleOfficeDataChange = (officeId: number, field: 'reporting_time' | 'duty_hours', value: string | number) => {
    setSelectedOffices(prev => 
      prev.map(office => 
        office.office_id === officeId 
          ? { ...office, [field]: field === 'duty_hours' ? parseFloat(value as string) || 0 : value }
          : office
      )
    );
  };

  const selectedCount = selectedOffices.filter(office => office.selected).length;

  if (officesLoading) {
    return (
      <div className="mb-4">
        <div className="text-sm text-gray-500">Loading offices...</div>
      </div>
    );
  }

  if (!offices || offices.length === 0) {
    return (
      <div className="mb-4">
        <div className="text-sm text-red-600">No offices available. Please create offices first.</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Offices <span className="text-red-500">*</span>
      </label>
      
      {/* Summary */}
      <div className="mb-3 p-2 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-700">
          {selectedCount === 0 
            ? "Select at least one office for this position"
            : `${selectedCount} office${selectedCount > 1 ? 's' : ''} selected`
          }
        </div>
        {selectedCount > 0 && (
          <div className="text-xs text-blue-600 mt-1">
            💡 Tip: You can create the same position with different reporting times in the same office by submitting this form again with different time settings.
          </div>
        )}
      </div>

      {/* Office Selection Grid */}
      <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4">
        {selectedOffices.map((office) => (
          <div 
            key={office.office_id}
            className={`p-3 border rounded-md transition-colors ${
              office.selected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id={`office-${office.office_id}`}
                checked={office.selected}
                onChange={() => handleOfficeToggle(office.office_id)}
                disabled={disabled}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              
              <div className="flex-1">
                <label 
                  htmlFor={`office-${office.office_id}`}
                  className="text-sm font-medium text-gray-900 cursor-pointer"
                >
                  {office.office_name}
                </label>
                
                {office.selected && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Reporting Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={office.reporting_time}
                        onChange={(e) => handleOfficeDataChange(office.office_id, 'reporting_time', e.target.value)}
                        disabled={disabled}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Duty Hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={office.duty_hours}
                        onChange={(e) => handleOfficeDataChange(office.office_id, 'duty_hours', e.target.value)}
                        disabled={disabled}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Validation Errors */}
      {selectedCount === 0 && (
        <p className="mt-2 text-sm text-red-600">At least one office must be selected</p>
      )}
      
      {validationError && (
        <p className="mt-2 text-sm text-red-600">{validationError}</p>
      )}

      {/* Hidden input for form validation */}
      <input
        {...register('offices', {
          validate: (value) => {
            if (!value || value.length === 0) {
              return 'At least one office must be selected';
            }
            if (validationError) {
              return validationError;
            }
            return true;
          }
        })}
        type="hidden"
      />
      
      {errors.offices && (
        <p className="mt-2 text-sm text-red-600">{errors.offices.message}</p>
      )}
    </div>
  );
};

export default PositionOfficeSelection;
