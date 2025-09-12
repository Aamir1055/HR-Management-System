/**
 * Date utility functions for consistent date handling across the application.
 * All employee date fields (joiningDate, dob, passport_expiry, visa_expiry)
 * are expected to be epoch times in milliseconds from the backend API.
 */

/**
 * Displays date value directly from database (already in DD/MM/YYYY format)
 * @param dateValue - Date string from database (DD/MM/YYYY format) or null/undefined
 * @returns Date string as-is from database, or "No Date" if empty
 */
export const formatDateFromEpoch = (dateValue: number | string | Date | null | undefined): string => {
  if (!dateValue) return 'No Date';
  
  // If it's already a string from database (DD/MM/YYYY format), return it directly
  if (typeof dateValue === 'string') {
    // Check if it's in DD/MM/YYYY format (our database format)
    if (dateValue.includes('/') && dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateValue; // Return DD/MM/YYYY directly
    }
    
    // Handle legacy YYYY-MM-DD format (convert to DD/MM/YYYY)
    if (dateValue.includes('-') && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const [year, month, day] = dateValue.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
      } catch (error) {
        console.error('Error converting legacy date format:', error);
        return dateValue; // Return as-is if conversion fails
      }
    }
    
    // If it's some other string format, return as-is
    return dateValue;
  }
  
  // Handle legacy epoch time (convert to DD/MM/YYYY)
  if (typeof dateValue === 'number') {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting epoch date:', error);
      return 'Invalid Date';
    }
  }
  
  // Handle Date objects
  if (dateValue instanceof Date) {
    try {
      if (isNaN(dateValue.getTime())) return 'Invalid Date';
      
      return dateValue.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting Date object:', error);
      return 'Invalid Date';
    }
  }
  
  return 'Invalid Date';
};

/**
 * Formats date value to YYYY-MM-DD string for HTML date input elements
 * @param dateValue - Date from database (DD/MM/YYYY), epoch time (milliseconds), YYYY-MM-DD string, or Date object
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if invalid
 */
export const formatDateForInput = (dateValue: number | string | Date | null | undefined): string => {
  if (!dateValue) return '';
  
  try {
    if (typeof dateValue === 'string') {
      // Handle DD/MM/YYYY format from database
      if (dateValue.includes('/') && dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateValue.split('/');
        return `${year}-${month}-${day}`; // Convert to YYYY-MM-DD
      }
      
      // If it's already in YYYY-MM-DD format, return it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      // Handle other date string formats
      if (dateValue.includes('-')) {
        const date = new Date(dateValue + 'T00:00:00.000Z');
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Try parsing as general date string
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    if (typeof dateValue === 'number') {
      // Handle epoch time in milliseconds
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    if (dateValue instanceof Date) {
      // Handle Date objects
      if (!isNaN(dateValue.getTime())) {
        return dateValue.toISOString().split('T')[0];
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

/**
 * Converts a date input value (YYYY-MM-DD) to epoch time in milliseconds
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Epoch time in milliseconds, or null if invalid
 */
export const dateInputToEpoch = (dateString: string): number | null => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return date.getTime();
  } catch (error) {
    console.error('Error converting date input to epoch:', error);
    return null;
  }
};

/**
 * Validates if a value is a valid epoch timestamp
 * @param value - Value to validate
 * @returns true if valid epoch timestamp, false otherwise
 */
export const isValidEpochTime = (value: any): value is number => {
  if (typeof value !== 'number') return false;
  if (value < 0) return false; // Negative timestamps are invalid for our use case
  
  try {
    const date = new Date(value);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Helper function to safely handle mixed date formats (epoch, ISO string, etc.)
 * and convert them to DD/MM/YYYY display format
 * @param dateValue - Date value in various formats (epoch, ISO string, etc.)
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const safeDateDisplay = (dateValue: any): string => {
  if (!dateValue) return 'No Date';
  
  // If it's already a number (epoch), use it directly
  if (typeof dateValue === 'number') {
    return formatDateFromEpoch(dateValue);
  }
  
  // If it's a string that looks like an ISO date
  if (typeof dateValue === 'string') {
    if (dateValue.includes('-')) {
      try {
        const date = new Date(dateValue);
        return formatDateFromEpoch(date.getTime());
      } catch {
        return 'Invalid Date';
      }
    }
    
    // If it's a string that might be a stringified number
    const asNumber = Number(dateValue);
    if (!isNaN(asNumber)) {
      return formatDateFromEpoch(asNumber);
    }
  }
  
  return 'Invalid Date';
};
