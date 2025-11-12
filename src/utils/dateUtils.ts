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
  // Enhanced debug logging - always log in production for troubleshooting
  console.log('🔍 formatDateFromEpoch input:', { 
    dateValue, 
    type: typeof dateValue, 
    isNull: dateValue === null, 
    isUndefined: dateValue === undefined,
    toString: dateValue?.toString(),
    length: typeof dateValue === 'string' ? dateValue.length : 'N/A'
  });

  // Local helper: format a DD/MM/YYYY string as-is (NO date manipulation)
  const formatDDMMYYYY = (value: string): string => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
    return value; // Return as-is without any date manipulation
  };

  // Local helper: format a Date to DD/MM/YYYY WITHOUT any adjustment
  const formatDateToDisplay = (dt: Date): string => {
    if (isNaN(dt.getTime())) return 'Invalid Date';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = String(dt.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };
  
  // Handle null, undefined, empty string, or whitespace-only strings
  if (!dateValue || (typeof dateValue === 'string' && dateValue.trim() === '')) {
    return 'No Date';
  }
  
  // If it's already a string from database
  if (typeof dateValue === 'string') {
    const trimmedValue = dateValue.trim();
    
    // Check if it's in DD/MM/YYYY format (our expected display format)
    if (trimmedValue.includes('/') && trimmedValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // Return as-is without any date manipulation
      return formatDDMMYYYY(trimmedValue);
    }
    
    // Handle YYYY-MM-DD format (convert to DD/MM/YYYY)
    if (trimmedValue.includes('-') && trimmedValue.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const datePart = trimmedValue.split('T')[0]; // Remove time if present
        const [year, month, day] = datePart.split('-');
        
        // Validate the extracted parts
        if (year && month && day && year.length === 4 && month.length <= 2 && day.length <= 2) {
          const paddedMonth = month.padStart(2, '0');
          const paddedDay = day.padStart(2, '0');
          const result = `${paddedDay}/${paddedMonth}/${year}`;
          
          // Validate the result is a proper date
          const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(testDate.getTime())) {
            return formatDDMMYYYY(result);
          }
        }
      } catch (error) {
        console.error('Error converting YYYY-MM-DD date format:', error, 'Input:', dateValue);
      }
    }
    
    // Try to parse as a general date string if it's not in expected formats
    try {
      const parsedDate = new Date(trimmedValue);
      if (!isNaN(parsedDate.getTime())) {
        return formatDateToDisplay(parsedDate);
      }
    } catch (error) {
      console.error('Error parsing date string:', error, 'Input:', dateValue);
    }
    
    // If all parsing fails, return the original value (no adjustment possible)
    console.warn('Unable to parse date string, returning as-is:', dateValue);
    return trimmedValue;
  }
  
  // Handle legacy epoch time (convert to DD/MM/YYYY)
  if (typeof dateValue === 'number') {
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return formatDateToDisplay(date);
    } catch (error) {
      console.error('Error formatting epoch date:', error);
      return 'Invalid Date';
    }
  }
  
  // Handle Date objects
  if (dateValue instanceof Date) {
    try {
      if (isNaN(dateValue.getTime())) return 'Invalid Date';
      return formatDateToDisplay(dateValue);
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
      // Handle DD/MM/YYYY format from database - NOTE: no +1 day here as formatDateFromEpoch already applied it
      if (dateValue.includes('/') && dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateValue.split('/');
        return `${year}-${month}-${day}`; // Convert to YYYY-MM-DD directly
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

/**
 * Formats timestamp to DD/MM/YYYY with optional time display
 * Only shows the timestamp if it can be properly parsed as a valid date
 * If parsing fails, returns empty string to hide the timestamp
 * @param timestamp - Timestamp string (ISO format, epoch, etc.)
 * @param includeTime - Whether to include time portion (default: true)
 * @returns Formatted timestamp string in DD/MM/YYYY format, or empty string if invalid
 */
export const formatTimestampSafely = (timestamp: string | number | Date | null | undefined, includeTime: boolean = true): string => {
  if (!timestamp) return '';
  
  try {
    let date: Date;
    
    if (typeof timestamp === 'string') {
      // Try parsing the string as a date
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Handle epoch timestamp
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return ''; // Cannot parse, hide timestamp
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return ''; // Invalid date, hide timestamp
    }
    
    // Format to DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const dateString = `${day}/${month}/${year}`;
    
    if (!includeTime) {
      return dateString;
    }
    
    // Add time portion in 12-hour format with AM/PM
    const timeString = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    return `${dateString} ${timeString}`;
    
  } catch (error) {
    console.warn('Failed to parse timestamp, hiding:', timestamp, error);
    return ''; // Failed to parse, hide timestamp
  }
};

/**
 * ATTENDANCE-SPECIFIC DATE FORMATTING FUNCTIONS
 * These functions handle date formatting for attendance records
 * without the +1 day adjustment used in employee data
 */

/**
 * Convert attendance date from server format (YYYY-MM-DD) to display format (DD/MM/YYYY)
 * This function does NOT apply the +1 day adjustment used in employee data
 * @param dateString - Date string in YYYY-MM-DD format from attendance records
 * @returns Date string in DD/MM/YYYY format, or empty string if invalid
 */
export const formatAttendanceDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Handle YYYY-MM-DD format (standard server format)
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const datePart = dateString.split('T')[0]; // Remove time if present
      const [year, month, day] = datePart.split('-');
      
      // Validate the extracted parts
      if (year && month && day && year.length === 4 && month.length <= 2 && day.length <= 2) {
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        
        // Validate the result is a proper date
        const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(testDate.getTime())) {
          return `${paddedDay}/${paddedMonth}/${year}`;
        }
      }
    }
    
    // If it's already in DD/MM/YYYY format, return as-is
    if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString;
    }
    
    // Try to parse as a general date string
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      const dd = String(parsedDate.getDate()).padStart(2, '0');
      const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const yyyy = String(parsedDate.getFullYear());
      return `${dd}/${mm}/${yyyy}`;
    }
    
    console.warn('Unable to parse attendance date, returning as-is:', dateString);
    return dateString;
  } catch (error) {
    console.error('Error formatting attendance date for display:', error, 'Input:', dateString);
    return dateString;
  }
};

/**
 * Convert attendance date from display format (DD/MM/YYYY) to server format (YYYY-MM-DD)
 * @param dateString - Date string in DD/MM/YYYY format
 * @returns Date string in YYYY-MM-DD format, or empty string if invalid
 */
export const formatAttendanceDateForServer = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Handle DD/MM/YYYY format
    if (typeof dateString === 'string' && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateString.split('/');
      
      // Validate the extracted parts
      const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(testDate.getTime())) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // If it's already in YYYY-MM-DD format, return as-is
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    // Try to parse as a general date string
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      const yyyy = String(parsedDate.getFullYear());
      const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(parsedDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    
    console.warn('Unable to parse attendance date for server, returning as-is:', dateString);
    return dateString;
  } catch (error) {
    console.error('Error formatting attendance date for server:', error, 'Input:', dateString);
    return dateString;
  }
};

/**
 * Parse URL query parameter dates and convert them for attendance display
 * Assumes URL params are in YYYY-MM-DD format from the server
 */
export const parseAttendanceUrlDateParam = (paramValue: string | null): string => {
  if (!paramValue) return '';
  return formatAttendanceDateForDisplay(paramValue);
};

/**
 * Convert display format date to URL param format for attendance API requests
 */
export const formatAttendanceDateForUrlParam = (displayDate: string): string => {
  return formatAttendanceDateForServer(displayDate);
};
