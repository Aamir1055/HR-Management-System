/**
 * Date Utility Functions
 * Centralized date processing and format conversion utilities
 * Handles Excel serial dates, DD/MM/YYYY, YYYY-MM-DD formats consistently
 */

/**
 * Convert Excel date serial number to YYYY-MM-DD format
 * @param {number|string} serial - Excel serial number or date string
 * @returns {string} - Date in YYYY-MM-DD format or original value
 */
function excelDateToYYYYMMDD(serial) {
  // If it's already a string in date format, normalize it properly
  if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
    try {
      const parts = serial.split(/[-\/]/);
      if (parts.length === 3) {
        let day, month, year;
        
        if (parts[0].length === 4) {
          // YYYY-MM-DD or YYYY/MM/DD format
          year = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1; // 0-indexed for Date constructor
          day = parseInt(parts[2]);
        } else {
          // DD-MM-YYYY, DD/MM/YYYY format (always assume DD/MM/YYYY for consistency)
          year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2]);
          day = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1; // 0-indexed for Date constructor
          
          // Validation check
          if (day > 31 || month < 0 || month > 11) {
            console.warn(`⚠️ Invalid date components: day=${day}, month=${month + 1}, year=${year}`);
            return serial;
          }
        }
        
        // Create date without timezone manipulation
        const dateObj = new Date(year, month, day);
        
        // Format as YYYY-MM-DD
        const finalYear = dateObj.getFullYear();
        const finalMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const finalDay = dateObj.getDate().toString().padStart(2, '0');
        
        const result = `${finalYear}-${finalMonth}-${finalDay}`;
        console.log(`📅 String Date: ${serial} → ${result}`);
        return result;
      }
    } catch (e) {
      console.warn(`Failed to parse date string: ${serial}`, e);
    }
    return serial;
  }
  
  // Handle Excel date serial numbers
  if (typeof serial === 'number') {
    try {
      // Excel date serial calculation (1900-based system)
      const EXCEL_EPOCH_DIFF = 25569; // Days between 1900-01-01 and 1970-01-01
      const MS_PER_DAY = 86400000;
      
      // Convert serial to milliseconds since Unix epoch
      const dateMs = (serial - EXCEL_EPOCH_DIFF) * MS_PER_DAY;
      
      // Create date object from milliseconds
      const date = new Date(dateMs);
      
      // Extract date components using UTC to avoid any timezone conversion
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = date.getUTCDate().toString().padStart(2, '0');
      
      const result = `${year}-${month}-${day}`;
      console.log(`📅 Serial Date: ${serial} → ${result}`);
      return result;
    } catch (e) {
      console.warn(`Failed to parse Excel serial date: ${serial}`, e);
    }
  }
  
  return serial;
}

/**
 * Convert YYYY-MM-DD date to DD/MM/YYYY format for frontend display
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string|null} - Date in DD/MM/YYYY format or null
 */
function formatDateForDisplay(dateStr) {
  if (!dateStr) return null;
  
  // If it's already in YYYY-MM-DD format (from database)
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  
  // Return as-is if not in expected format
  return dateStr;
}

/**
 * Convert date from various frontend formats to YYYY-MM-DD for database storage
 * @param {string} dateStr - Date string from frontend (DD/MM/YYYY or other formats)
 * @returns {string|null} - Date in YYYY-MM-DD format or null
 */
function formatDateForStorage(dateStr) {
  if (!dateStr) return null;
  
  console.log(`🔍 Formatting date for storage: '${dateStr}' (type: ${typeof dateStr})`);
  
  try {
    let parsedDate;
    
    // Handle different input formats
    if (typeof dateStr === 'string') {
      // Remove any time portion first
      const dateOnly = dateStr.split('T')[0].split(' ')[0];
      
      // Try to create a date from the string
      if (dateOnly.includes('/')) {
        // Handle DD/MM/YYYY format
        const parts = dateOnly.split('/');
        if (parts.length === 3) {
          // Assume DD/MM/YYYY format (more common)
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed in Date
          const year = parseInt(parts[2]);
          parsedDate = new Date(year, month, day);
        } else {
          parsedDate = new Date(dateStr);
        }
      } else {
        parsedDate = new Date(dateStr);
      }
    } else {
      parsedDate = new Date(dateStr);
    }
    
    if (isNaN(parsedDate.getTime())) {
      console.warn(`❌ Invalid date: ${dateStr}`);
      return null;
    }
    
    // Format as YYYY-MM-DD without any manipulation
    const year = parsedDate.getFullYear();
    const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = parsedDate.getDate().toString().padStart(2, '0');
    
    const result = `${year}-${month}-${day}`;
    console.log(`✅ Date formatted for storage: ${dateStr} → ${result}`);
    return result;
    
  } catch (error) {
    console.warn(`❌ Error parsing date '${dateStr}':`, error.message);
    return null;
  }
}

/**
 * Convert date to Excel serial number for Excel export
 * @param {string} dateStr - Date string in various formats
 * @returns {number|null} - Excel serial number or null
 */
function dateToExcelSerial(dateStr) {
  if (!dateStr) return null;
  
  try {
    let date;
    
    // Handle different input formats
    if (typeof dateStr === 'string') {
      // If it's already in YYYY-MM-DD format (from database)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateStr + 'T00:00:00');
      }
      // If it's in DD/MM/YYYY format, parse correctly
      else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateStr.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      // Try to parse as a general date
      else {
        date = new Date(dateStr + 'T00:00:00');
      }
    } else {
      date = new Date(dateStr);
    }
    
    // Add +1 day to fix Excel export date offset issue
    if (date && !isNaN(date.getTime())) {
      date.setDate(date.getDate() + 1);
      
      // Excel date serial calculation (1900-based system)
      const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)); // December 30, 1899
      const MS_PER_DAY = 86400000;
      
      const timeDiff = date.getTime() - EXCEL_EPOCH.getTime();
      const excelSerial = Math.floor(timeDiff / MS_PER_DAY);
      
      console.log(`📅 Date to Excel serial: ${dateStr} → +1 day → ${excelSerial}`);
      return excelSerial;
    }
    
    return null;
  } catch (error) {
    console.warn(`Warning: Could not parse date '${dateStr}':`, error.message);
    return null;
  }
}

/**
 * Format date for Excel template (DD/MM/YYYY)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Date in DD/MM/YYYY format for templates
 */
function formatDateForTemplate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // Format as DD/MM/YYYY for Excel templates
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * Validate if a date string is in valid format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid date
 */
function isValidDate(dateStr) {
  if (!dateStr) return false;
  
  try {
    // Try DD/MM/YYYY format first
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateStr.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return !isNaN(date.getTime()) && 
             date.getDate() === parseInt(day) &&
             date.getMonth() === parseInt(month) - 1 &&
             date.getFullYear() === parseInt(year);
    }
    
    // Try YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }
    
    // Try general date parsing
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Current date in YYYY-MM-DD format
 */
function getCurrentDateYYYYMMDD() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current date in DD/MM/YYYY format
 * @returns {string} - Current date in DD/MM/YYYY format
 */
function getCurrentDateDDMMYYYY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${day}/${month}/${year}`;
}

module.exports = {
  excelDateToYYYYMMDD,
  formatDateForDisplay,
  formatDateForStorage,
  dateToExcelSerial,
  formatDateForTemplate,
  isValidDate,
  getCurrentDateYYYYMMDD,
  getCurrentDateDDMMYYYY
};
