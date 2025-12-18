/**
 * Attendance Calculator Utility
 * Calculates late arrival, early departure, half-day status, and working hours
 * Based on employee shift timings and punch in/out times
 */

const moment = require('moment');
const { parseShiftTiming, amPmTo24Hour } = require('./shiftUtils');
const db = require('../db');

/**
 * Parse shift timing string and extract start/end times in 24-hour format
 * @param {string} shiftTimings - Shift timing string (e.g., "9:00 AM - 6:00 PM")
 * @returns {Object|null} - Object with start24, end24, and dutyHours or null
 */
function parseEmployeeShiftTiming(shiftTimings) {
  if (!shiftTimings || typeof shiftTimings !== 'string') {
    // Default shift if no timing specified
    return {
      start24: '09:00',
      end24: '18:00', 
      dutyHours: 9 // 9 hours including 1 hour lunch break
    };
  }
  
  const parsed = parseShiftTiming(shiftTimings);
  if (!parsed) {
    console.warn(`Failed to parse shift timing: ${shiftTimings}, using default`);
    return {
      start24: '09:00',
      end24: '18:00',
      dutyHours: 9
    };
  }
  
  return {
    start24: parsed.start24,
    end24: parsed.end24,
    dutyHours: parsed.hours || 9
  };
}

/**
 * Convert time string to minutes since midnight
 * @param {string} timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns {number|null} - Minutes since midnight or null
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  
  try {
    const time = moment(timeStr.toString(), ['HH:mm:ss', 'HH:mm'], true);
    if (!time.isValid()) return null;
    
    return time.hours() * 60 + time.minutes();
  } catch (error) {
    console.warn(`Failed to parse time: ${timeStr}`, error);
    return null;
  }
}

/**
 * Calculate actual working hours between punch in and punch out
 * @param {string} punchIn - Punch in time
 * @param {string} punchOut - Punch out time  
 * @returns {number|null} - Working hours or null
 */
function calculateActualHours(punchIn, punchOut) {
  const startMinutes = timeToMinutes(punchIn);
  const endMinutes = timeToMinutes(punchOut);
  
  if (startMinutes === null || endMinutes === null) return null;
  
  let diffMinutes = endMinutes - startMinutes;
  
  // Handle overnight shifts
  if (diffMinutes < 0) {
    diffMinutes += 1440; // Add 24 hours worth of minutes
  }
  
  // Convert to hours with 2 decimal precision
  return Math.round((diffMinutes / 60) * 100) / 100;
}

/**
 * Calculate late minutes based on shift start time and punch in time
 * @param {string} shiftStartTime - Shift start time (HH:MM format)
 * @param {string} punchInTime - Actual punch in time
 * @returns {number} - Late minutes (0 if not late)
 */
function calculateLateMinutes(shiftStartTime, punchInTime) {
  const shiftStartMinutes = timeToMinutes(shiftStartTime);
  const punchInMinutes = timeToMinutes(punchInTime);
  
  if (shiftStartMinutes === null || punchInMinutes === null) return 0;
  
  const lateMinutes = punchInMinutes - shiftStartMinutes;
  return Math.max(0, lateMinutes);
}

/**
 * Calculate early departure minutes based on shift end time and punch out time
 * @param {string} shiftEndTime - Shift end time (HH:MM format)
 * @param {string} punchOutTime - Actual punch out time
 * @returns {number} - Early departure minutes (0 if not early)
 */
function calculateEarlyDepartureMinutes(shiftEndTime, punchOutTime) {
  const shiftEndMinutes = timeToMinutes(shiftEndTime);
  const punchOutMinutes = timeToMinutes(punchOutTime);
  
  if (shiftEndMinutes === null || punchOutMinutes === null) return 0;
  
  const earlyMinutes = shiftEndMinutes - punchOutMinutes;
  return Math.max(0, earlyMinutes);
}

/**
 * Determine attendance status based on working hours and shift requirements
 * @param {number} actualHours - Actual hours worked
 * @param {number} dutyHours - Required duty hours
 * @param {number} lateMinutes - Late arrival minutes
 * @param {boolean} isAbsent - Whether employee is marked absent
 * @returns {Object} - Status object with attendance_status, is_late, is_half_day
 */
function determineAttendanceStatus(actualHours, dutyHours, lateMinutes, isAbsent = false) {
  if (isAbsent || actualHours === null || actualHours <= 0) {
    return {
      attendance_status: 'ABSENT',
      is_late: false,
      is_half_day: false
    };
  }
  
  const isLate = lateMinutes >= 1; // Late if even 1 minute late
  const isHalfDay = actualHours < dutyHours; // Half day if didn't complete full duty hours
  
  let status = 'PRESENT';
  
  if (isHalfDay) {
    status = isLate ? 'HALF_DAY_LATE' : 'HALF_DAY';
  } else if (isLate) {
    status = 'PRESENT_LATE';
  }
  
  return {
    attendance_status: status,
    is_late: isLate,
    is_half_day: isHalfDay
  };
}

/**
 * Calculate duty hours deficit (shortfall in working hours)
 * @param {number} actualHours - Actual hours worked
 * @param {number} dutyHours - Required duty hours
 * @returns {number} - Duty hours deficit (0 if no deficit)
 */
function calculateDutyHoursDeficit(actualHours, dutyHours) {
  if (actualHours === null || dutyHours === null) return 0;
  
  const deficit = dutyHours - actualHours;
  return Math.max(0, Math.round(deficit * 100) / 100);
}

/**
 * Get active half-day shifts from database
 * @returns {Array} - Array of active half-day shift configurations
 */
async function getHalfDayShifts() {
  try {
    const [rows] = await db.query(
      `SELECT * FROM half_day_shifts WHERE is_active = TRUE ORDER BY start_time`
    );
    return rows;
  } catch (error) {
    console.warn('Error fetching half day shifts:', error);
    return [];
  }
}

/**
 * Check if punch times match any configured half-day shift pattern
 * @param {string} punchIn - Punch in time
 * @param {string} punchOut - Punch out time
 * @param {number} actualHours - Actual hours worked
 * @returns {Object|null} - Half-day shift match info or null
 */
async function detectHalfDayShift(punchIn, punchOut, actualHours) {
  try {
    const shifts = await getHalfDayShifts();
    
    if (!punchIn || !punchOut || !shifts.length) {
      return null;
    }
    
    const punchInTime = moment(punchIn, ['HH:mm:ss', 'HH:mm']);
    const punchOutTime = moment(punchOut, ['HH:mm:ss', 'HH:mm']);
    
    if (!punchInTime.isValid() || !punchOutTime.isValid()) {
      return null;
    }
    
    // Calculate actual work duration in minutes
    const workDurationMinutes = punchOutTime.diff(punchInTime, 'minutes');
    
    // Store all possible matches to select the best one
    let bestMatch = null;
    let bestScore = 0;
    
    for (const shift of shifts) {
      const shiftStart = moment(shift.start_time, 'HH:mm:ss');
      const shiftEnd = moment(shift.end_time, 'HH:mm:ss');
      const minRequiredHours = parseFloat(shift.min_hours);
      const shiftDurationMinutes = shiftEnd.diff(shiftStart, 'minutes');
      
      // Calculate overlap between work time and shift time
      const overlapStart = moment.max(punchInTime, shiftStart);
      const overlapEnd = moment.min(punchOutTime, shiftEnd);
      const overlapMinutes = overlapEnd.isAfter(overlapStart) ? overlapEnd.diff(overlapStart, 'minutes') : 0;
      
      // CRITICAL: Only consider as half-day if worked hours are actually in half-day range
      // Never mark someone as half-day if they worked 7+ hours (that's a full day or more)
      const maxHalfDayHours = 6.5; // Maximum hours that can be considered half-day
      const isWithinHalfDayHourRange = actualHours >= 3.5 && actualHours <= maxHalfDayHours;
      
      if (!isWithinHalfDayHourRange) {
        // Skip this shift if hours worked are outside half-day range
        continue;
      }
      
      // Check if there's significant overlap with this half-day shift
      const overlapPercentage = overlapMinutes / shiftDurationMinutes;
      const minOverlapPercentage = 0.6; // At least 60% overlap required
      
      // Alternative check: if actual hours are close to the minimum required hours for half-day
      const hoursCloseToHalfDay = Math.abs(actualHours - minRequiredHours) <= 1.0; // Within 1 hour of minimum
      
      // Check if this qualifies as a half-day shift
      const hasSignificantOverlap = overlapPercentage >= minOverlapPercentage;
      const workedApproximateHalfDayHours = actualHours >= (minRequiredHours - 0.5) && actualHours <= (minRequiredHours + 1.5);
      
      // Enhanced detection: Check if work pattern resembles this half-day shift
      let isHalfDayMatch = false;
      
      if (shift.shift_name === 'Morning Half Day') {
        // For morning half-day: punch in should be close to shift start, worked hours should be around 4.5-6 hours
        const punchInCloseToShiftStart = Math.abs(punchInTime.diff(shiftStart, 'minutes')) <= 90; // Within 1.5 hour
        const workedMorningHours = actualHours >= 4.0 && actualHours <= 6.5;
        isHalfDayMatch = punchInCloseToShiftStart && workedMorningHours;
      } else if (shift.shift_name === 'Afternoon Half Day') {
        // For afternoon half-day: punch out should be close to shift end, worked hours should be around 4.5-6 hours  
        const punchOutCloseToShiftEnd = Math.abs(punchOutTime.diff(shiftEnd, 'minutes')) <= 90; // Within 1.5 hour
        const workedAfternoonHours = actualHours >= 4.0 && actualHours <= 6.5;
        isHalfDayMatch = punchOutCloseToShiftEnd && workedAfternoonHours;
      }
      
      // Final decision: Must meet hours requirement AND have good overlap or pattern match
      if (isWithinHalfDayHourRange && (hasSignificantOverlap || isHalfDayMatch || workedApproximateHalfDayHours)) {
        // Calculate a score to determine the best match
        let score = 0;
        if (hasSignificantOverlap) score += overlapPercentage * 100;
        if (isHalfDayMatch) score += 50; // High score for pattern match
        if (workedApproximateHalfDayHours) score += 30;
        
        console.log(`Half-day candidate: ${shift.shift_name}, overlap: ${overlapMinutes}min (${Math.round(overlapPercentage * 100)}%), actual hours: ${actualHours}, score: ${score}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            shiftId: shift.id,
            shiftName: shift.shift_name,
            shiftStartTime: shift.start_time,
            shiftEndTime: shift.end_time,
            isPlannedHalfDay: true,
            minRequiredHours: minRequiredHours,
            actualHours: actualHours,
            overlapMinutes: overlapMinutes,
            overlapPercentage: Math.round(overlapPercentage * 100)
          };
        }
      }
    }
    
    if (bestMatch) {
      console.log(`Best half-day match selected: ${bestMatch.shiftName} (score: ${bestScore})`);
      return bestMatch;
    }
    
    return null;
  } catch (error) {
    console.warn('Error detecting half day shift:', error);
    return null;
  }
}

/**
 * Main function to calculate all attendance metrics for a single record
 * @param {Object} attendanceRecord - Attendance record with employee_id, date, punch_in, punch_out
 * @param {Object} employee - Employee object with shift_timings
 * @returns {Object} - Complete attendance calculation result
 */
async function calculateAttendanceMetrics(attendanceRecord, employee) {
  const { punch_in, punch_out } = attendanceRecord;
  const { shift_timings } = employee;
  
  // Parse employee shift timing
  const shiftInfo = parseEmployeeShiftTiming(shift_timings);
  const { start24, end24, dutyHours } = shiftInfo;
  
  // Check if employee is absent (no punch in/out or invalid times)
  const isAbsent = !punch_in || !punch_out || 
                   punch_in === '00:00:00' || punch_out === '00:00:00' ||
                   punch_in === '00:00' || punch_out === '00:00';
  
  if (isAbsent) {
    return {
      actual_hours_worked: 0.00,
      late_minutes: 0,
      early_departure_minutes: 0,
      attendance_status: 'ABSENT',
      is_half_day: false,
      is_late: false,
      duty_hours_deficit: dutyHours,
      duty_hours: dutyHours
    };
  }
  
  // Calculate actual working hours
  const actualHours = calculateActualHours(punch_in, punch_out) || 0;
  
  // Calculate late and early departure minutes
  let lateMinutes = calculateLateMinutes(start24, punch_in);
  let earlyDepartureMinutes = calculateEarlyDepartureMinutes(end24, punch_out);
  
  // Check for planned half-day shift
  const halfDayShiftInfo = await detectHalfDayShift(punch_in, punch_out, actualHours);
  const isPlannedHalfDay = !!(halfDayShiftInfo && halfDayShiftInfo.isPlannedHalfDay);
  
  // Determine attendance status
  let statusInfo = determineAttendanceStatus(actualHours, dutyHours, lateMinutes, false);
  
  // If this matches a planned half-day shift, recalculate late minutes based on half-day shift timing
  if (isPlannedHalfDay) {
    // Calculate late minutes based on half-day shift start time (not regular shift time)
    const shiftStart = moment(halfDayShiftInfo.shiftStartTime, 'HH:mm:ss');
    const punchInTime = moment(punch_in, ['HH:mm:ss', 'HH:mm']);
    
    // Calculate late minutes based on half-day shift start time
    const halfDayLateMinutes = Math.max(0, punchInTime.diff(shiftStart, 'minutes'));
    lateMinutes = halfDayLateMinutes;
    
    console.log(`Half-day late calculation: shift "${halfDayShiftInfo.shiftName}" starts ${halfDayShiftInfo.shiftStartTime}, punch in ${punch_in}, late minutes: ${halfDayLateMinutes}`);
    
    // No early departure penalty for half-day shifts
    earlyDepartureMinutes = 0;
    
    // Determine if late based on half-day shift timing
    const isLateForHalfDay = lateMinutes >= 1;
    
    statusInfo = {
      attendance_status: isLateForHalfDay ? 'HALF_DAY_LATE' : 'HALF_DAY',
      is_late: isLateForHalfDay,
      is_half_day: true
    };
  }
  
  // Calculate duty hours deficit (no deficit for planned half-day if minimum hours met)
  const dutyHoursDeficit = isPlannedHalfDay ? 0 : calculateDutyHoursDeficit(actualHours, dutyHours);
  
  return {
    actual_hours_worked: Math.round(actualHours * 100) / 100,
    late_minutes: lateMinutes,
    early_departure_minutes: earlyDepartureMinutes,
    attendance_status: statusInfo.attendance_status,
    is_half_day: statusInfo.is_half_day,
    is_late: statusInfo.is_late,
    is_planned_half_day: isPlannedHalfDay,
    planned_half_day_shift_id: halfDayShiftInfo?.shiftId || null,
    planned_half_day_shift_name: halfDayShiftInfo?.shiftName || null,
    duty_hours_deficit: dutyHoursDeficit,
    duty_hours: dutyHours
  };
}

/**
 * Batch calculate attendance metrics for multiple records
 * @param {Array} attendanceRecords - Array of attendance records
 * @param {Array} employees - Array of employee objects
 * @returns {Array} - Array of calculated attendance records
 */
async function batchCalculateAttendanceMetrics(attendanceRecords, employees) {
  // Create employee lookup map
  const employeeMap = new Map();
  employees.forEach(emp => {
    // Handle both employeeId and employee_id fields
    const empId = emp.employeeId || emp.employee_id;
    if (empId) {
      // Store with both string and numeric keys for flexibility
      employeeMap.set(empId.toString(), emp);
      employeeMap.set(parseInt(empId).toString(), emp);
    }
  });
  
  // Use Promise.all to handle async calculations
  const calculationPromises = attendanceRecords.map(async (record) => {
    // Handle both employee_id and employeeId fields in records
    const recordEmpId = record.employee_id || record.employeeId;
    const employee = employeeMap.get(recordEmpId ? recordEmpId.toString() : '');
    
    if (!employee) {
      console.warn(`Employee not found for attendance record: ${recordEmpId}`);
      return {
        ...record,
        actual_hours_worked: 0.00,
        late_minutes: 0,
        early_departure_minutes: 0,
        attendance_status: 'ABSENT',
        is_half_day: false,
        is_late: false,
        duty_hours_deficit: 8.00, // Default 8 hours
        duty_hours: 8.00
      };
    }
    
    const calculations = await calculateAttendanceMetrics(record, employee);
    
    return {
      ...record,
      ...calculations
    };
  });
  
  return Promise.all(calculationPromises);
}

module.exports = {
  parseEmployeeShiftTiming,
  timeToMinutes,
  calculateActualHours,
  calculateLateMinutes,
  calculateEarlyDepartureMinutes,
  determineAttendanceStatus,
  calculateDutyHoursDeficit,
  getHalfDayShifts,
  detectHalfDayShift,
  calculateAttendanceMetrics,
  batchCalculateAttendanceMetrics
};
