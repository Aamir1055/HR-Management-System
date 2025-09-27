/**
 * Shift Timing Utility Functions
 * Utilities for calculating and formatting employee shift timings
 */

/**
 * Parse time string to minutes since midnight
 * @param {string|number} timeStr - Time string (HH:MM format)
 * @returns {number|null} - Minutes since midnight or null
 */
function parseTimeToMinutes(timeStr) {
  if (timeStr == null) return null;
  
  try {
    const str = String(timeStr).trim();
    if (!str.includes(':')) return null;
    
    const parts = str.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10) || 0;
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    
    return (hours * 60) + minutes;
  } catch (error) {
    console.warn(`Failed to parse time: ${timeStr}`, error);
    return null;
  }
}

/**
 * Convert minutes since midnight to AM/PM format
 * @param {number} totalMinutes - Total minutes since midnight
 * @returns {string|null} - Time in AM/PM format or null
 */
function minutesToAmPm(totalMinutes) {
  if (totalMinutes == null || typeof totalMinutes !== 'number') return null;
  
  // Normalize to 0..1439 (24 hours worth of minutes)
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  
  const hours24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  
  const minutesStr = String(minutes).padStart(2, '0');
  
  return `${hours12}:${minutesStr} ${period}`;
}

/**
 * Compute shift timings string from reporting time and duty hours
 * @param {string} reportingTime - Reporting time (HH:MM format)
 * @param {number|string} dutyHours - Duty hours (decimal)
 * @returns {string|null} - Shift timing string or null
 */
function computeShiftTimings(reportingTime, dutyHours) {
  try {
    const startMinutes = parseTimeToMinutes(reportingTime);
    const dutyHoursNum = dutyHours != null ? Number(dutyHours) : null;
    
    if (startMinutes == null || dutyHoursNum == null || isNaN(dutyHoursNum)) {
      return null;
    }
    
    if (dutyHoursNum <= 0 || dutyHoursNum > 24) {
      return null; // Invalid duty hours
    }
    
    const endMinutes = startMinutes + Math.round(dutyHoursNum * 60);
    
    const startStr = minutesToAmPm(startMinutes);
    const endStr = minutesToAmPm(endMinutes);
    
    if (!startStr || !endStr) return null;
    
    return `${startStr} - ${endStr}`;
  } catch (error) {
    console.warn(`Failed to compute shift timings: reporting_time=${reportingTime}, duty_hours=${dutyHours}`, error);
    return null;
  }
}

/**
 * Validate time string format
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} - True if valid time format
 */
function isValidTimeFormat(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr.trim());
}

/**
 * Convert AM/PM time to 24-hour format
 * @param {string} amPmTime - Time in AM/PM format (e.g., "2:30 PM")
 * @returns {string|null} - Time in 24-hour format (HH:MM) or null
 */
function amPmTo24Hour(amPmTime) {
  if (!amPmTime || typeof amPmTime !== 'string') return null;
  
  try {
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match = amPmTime.trim().match(timeRegex);
    
    if (!match) return null;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    
    // Convert to 24-hour format
    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else { // PM
      if (hours !== 12) hours += 12;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.warn(`Failed to convert AM/PM time: ${amPmTime}`, error);
    return null;
  }
}

/**
 * Convert 24-hour time to AM/PM format
 * @param {string} time24 - Time in 24-hour format (HH:MM)
 * @returns {string|null} - Time in AM/PM format or null
 */
function time24ToAmPm(time24) {
  if (!time24 || typeof time24 !== 'string') return null;
  
  try {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = time24.trim().match(timeRegex);
    
    if (!match) return null;
    
    const hours24 = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    const period = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.warn(`Failed to convert 24-hour time: ${time24}`, error);
    return null;
  }
}

/**
 * Calculate total working hours between two times
 * @param {string} startTime - Start time (HH:MM format)
 * @param {string} endTime - End time (HH:MM format)
 * @returns {number|null} - Working hours or null
 */
function calculateWorkingHours(startTime, endTime) {
  try {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    
    if (startMinutes == null || endMinutes == null) return null;
    
    let diffMinutes = endMinutes - startMinutes;
    
    // Handle overnight shifts
    if (diffMinutes < 0) {
      diffMinutes += 1440; // Add 24 hours worth of minutes
    }
    
    return diffMinutes / 60; // Convert to hours
  } catch (error) {
    console.warn(`Failed to calculate working hours: start=${startTime}, end=${endTime}`, error);
    return null;
  }
}

/**
 * Get default shift timing if none provided
 * @returns {string} - Default shift timing
 */
function getDefaultShiftTiming() {
  return '9:00 AM - 6:00 PM';
}

/**
 * Parse shift timing string to get start and end times
 * @param {string} shiftTiming - Shift timing string (e.g., "9:00 AM - 6:00 PM")
 * @returns {Object|null} - Object with start and end times or null
 */
function parseShiftTiming(shiftTiming) {
  if (!shiftTiming || typeof shiftTiming !== 'string') return null;
  
  try {
    const shiftRegex = /^(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i;
    const match = shiftTiming.trim().match(shiftRegex);
    
    if (!match) return null;
    
    const startTime = match[1].trim();
    const endTime = match[2].trim();
    
    // Convert to 24-hour format for easier processing
    const start24 = amPmTo24Hour(startTime);
    const end24 = amPmTo24Hour(endTime);
    
    if (!start24 || !end24) return null;
    
    return {
      start: startTime,
      end: endTime,
      start24: start24,
      end24: end24,
      hours: calculateWorkingHours(start24, end24)
    };
  } catch (error) {
    console.warn(`Failed to parse shift timing: ${shiftTiming}`, error);
    return null;
  }
}

module.exports = {
  parseTimeToMinutes,
  minutesToAmPm,
  computeShiftTimings,
  isValidTimeFormat,
  amPmTo24Hour,
  time24ToAmPm,
  calculateWorkingHours,
  getDefaultShiftTiming,
  parseShiftTiming
};
