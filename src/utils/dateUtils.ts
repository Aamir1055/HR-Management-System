/**
 * Date utility functions for the application.
 * The backend API sends employee dates already formatted as DD/MM/YYYY.
 * These helpers just pass them through or do simple format conversions.
 */

/**
 * Display a date value as DD/MM/YYYY.
 * The backend already sends dates in DD/MM/YYYY, so mostly returns as-is.
 * Also handles YYYY-MM-DD strings by converting via string splitting (no Date object).
 */
export const formatDateFromEpoch = (dateValue: number | string | Date | null | undefined): string => {
  if (!dateValue || (typeof dateValue === 'string' && dateValue.trim() === '')) {
    return 'No Date';
  }

  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();

    // Already DD/MM/YYYY — return as-is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // YYYY-MM-DD (with optional time) — convert via string split, no Date object
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [year, month, day] = trimmed.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    }

    return trimmed;
  }

  return 'No Date';
};

/**
 * Convert a date value to YYYY-MM-DD for HTML <input type="date"> elements.
 * Accepts DD/MM/YYYY (from API) or YYYY-MM-DD strings.
 */
export const formatDateForInput = (dateValue: number | string | Date | null | undefined): string => {
  if (!dateValue) return '';

  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();

    // DD/MM/YYYY → YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('/');
      return `${year}-${month}-${day}`;
    }

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // YYYY-MM-DD with time portion
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.split('T')[0];
    }
  }

  return '';
};

/**
 * Format a timestamp (ISO string, epoch, Date) for display with optional time.
 * Used for comment timestamps, audit logs, etc.
 */
export const formatTimestampSafely = (timestamp: string | number | Date | null | undefined, includeTime: boolean = true): string => {
  if (!timestamp) return '';

  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const dateString = `${day}/${month}/${year}`;

    if (!includeTime) return dateString;

    const timeString = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return `${dateString} ${timeString}`;
  } catch {
    return '';
  }
};

/**
 * Convert attendance date from YYYY-MM-DD to DD/MM/YYYY for display.
 */
export const formatAttendanceDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';

  const trimmed = dateString.trim();

  // YYYY-MM-DD → DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [year, month, day] = trimmed.split('T')[0].split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  return dateString;
};

/**
 * Convert attendance date from DD/MM/YYYY to YYYY-MM-DD for server requests.
 */
export const formatAttendanceDateForServer = (dateString: string): string => {
  if (!dateString) return '';

  const trimmed = dateString.trim();

  // DD/MM/YYYY → YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return dateString;
};
