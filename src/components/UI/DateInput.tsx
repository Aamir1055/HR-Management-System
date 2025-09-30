import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  name: string;
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  error?: string;
  bgColor?: string;
  helpText?: string;
}

// Helper functions to convert between formats
const isoToDDMMYYYY = (iso: string): string => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const ddmmyyyyToISO = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || !/^\d{2}\/\d{2}\/\d{4}$/.test(ddmmyyyy)) return '';
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
};

const validateDate = (value: string): string | null => {
  if (!value) return null; // Allow empty for optional fields
  
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return 'Date must be in DD/MM/YYYY format';
  }
  
  const parts = value.split('/');
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  
  if (day < 1 || day > 31) return 'Day must be between 1-31';
  if (month < 1 || month > 12) return 'Month must be between 1-12';
  if (year < 1900 || year > 2100) return 'Year must be between 1900-2100';
  
  // Additional validation: check if the date is actually valid
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'Invalid date';
  }
  
  return null;
};

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({
  name,
  value = '',
  onChange,
  onBlur,
  placeholder = 'DD/MM/YYYY or click calendar',
  disabled = false,
  required = false,
  className = '',
  label,
  error,
  bgColor = 'bg-gray-50',
  helpText = 'Type DD/MM/YYYY or click to open date picker'
}, ref) => {
  const textInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => textInputRef.current!);

  // Auto-format input as user types
  const handleTextInput = (e: React.FormEvent<HTMLInputElement>) => {
    let inputValue = e.currentTarget.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format as DD/MM/YYYY
    if (inputValue.length >= 2) {
      inputValue = inputValue.substring(0, 2) + '/' + inputValue.substring(2);
    }
    if (inputValue.length >= 5) {
      inputValue = inputValue.substring(0, 5) + '/' + inputValue.substring(5, 9);
    }
    
    e.currentTarget.value = inputValue;
    onChange(inputValue);
  };

  // Handle manual text changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Handle text input focus - removed automatic date picker opening
  const handleTextFocus = () => {
    // Users can now type manually without the picker auto-opening
    // They can still click the calendar icon or field to open the picker manually
  };

  // Handle date picker changes
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoValue = e.target.value;
    const ddmmyyyy = isoToDDMMYYYY(isoValue);
    onChange(ddmmyyyy);
    
    // Focus back to text input to show formatted date
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  // Handle text input blur for validation
  const handleTextBlur = () => {
    // Validate the current value
    if (value) {
      const validationError = validateDate(value);
      if (validationError) {
        // You could emit the validation error here if needed
        console.warn('Date validation error:', validationError);
      }
    }
    onBlur?.();
  };

  const inputClasses = `
    w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 
    ${bgColor} focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
    ${className}
  `.trim();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Text input for manual typing */}
        <input
          ref={textInputRef}
          type="text"
          name={name}
          value={value}
          onChange={handleTextChange}
          onInput={handleTextInput}
          onBlur={handleTextBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={inputClasses}
          maxLength={10}
        />
        
        {/* Calendar icon */}
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        
        {/* Hidden date picker */}
        <input
          ref={dateInputRef}
          type="date"
          value={ddmmyyyyToISO(value)}
          onChange={handleDatePickerChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </div>
      
      {/* Help text */}
      {helpText && !error && (
        <div className="text-xs text-gray-500 mt-1">{helpText}</div>
      )}
      
      {/* Error message */}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
});

DateInput.displayName = 'DateInput';

export default DateInput;
