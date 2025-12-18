
/**
 * Flexible Employee Validation Service
 * More forgiving validation for Excel imports
 */

const { Employee } = require('../models/Employee');

class FlexibleEmployeeValidationService {
  constructor(employeeRepository) {
    this.employeeRepository = employeeRepository;
  }

  /**
   * Flexible validation for import - more forgiving than strict validation
   */
  validateForImport(employeeData, rowIndex = 0) {
    const errors = [];
    const warnings = [];

    try {
      // Only check absolutely essential fields
      const essentialFields = ['employeeId', 'email'];
      
      essentialFields.forEach(field => {
        if (!employeeData[field] || (typeof employeeData[field] === 'string' && employeeData[field].trim() === '')) {
          errors.push(`Row ${rowIndex + 1}: ${field} is required`);
        }
      });

      // Build name from first_name and last_name if name is missing
      if (!employeeData.name || employeeData.name.trim() === '') {
        if (employeeData.first_name || employeeData.last_name) {
          employeeData.name = `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim();
          if (employeeData.name) {
            warnings.push(`Row ${rowIndex + 1}: Name built from first and last name`);
          } else {
            errors.push(`Row ${rowIndex + 1}: Name is required (provide first_name and last_name or name)`);
          }
        } else {
          errors.push(`Row ${rowIndex + 1}: Name is required`);
        }
      }

      // Email validation - more flexible
      if (employeeData.email && !this.isFlexibleEmailFormat(employeeData.email)) {
        errors.push(`Row ${rowIndex + 1}: Invalid email format`);
      }

      // Set defaults for missing fields instead of failing
      if (!employeeData.office_id) {
        // Try to find a default office
        employeeData.office_id = 1; // Will be handled by auto-creation
        warnings.push(`Row ${rowIndex + 1}: No office specified, using default`);
      }

      if (!employeeData.position_id) {
        // Try to find a default position
        employeeData.position_id = 1; // Will be handled by auto-creation
        warnings.push(`Row ${rowIndex + 1}: No position specified, using default`);
      }

      // Set reasonable defaults
      if (!employeeData.monthlySalary || employeeData.monthlySalary <= 0) {
        employeeData.monthlySalary = 3000; // Default salary
        warnings.push(`Row ${rowIndex + 1}: No salary specified, using default 3000`);
      }

      if (!employeeData.joiningDate) {
        employeeData.joiningDate = new Date().toISOString().split('T')[0];
        warnings.push(`Row ${rowIndex + 1}: No joining date specified, using today`);
      }

      if (employeeData.status === undefined || employeeData.status === null) {
        employeeData.status = 1; // Active by default
        warnings.push(`Row ${rowIndex + 1}: No status specified, using active`);
      }

      // Convert status to number if it's a string
      if (typeof employeeData.status === 'string') {
        employeeData.status = employeeData.status.toLowerCase() === 'active' ? 1 : 0;
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        employeeData // Return modified data with defaults
      };
    } catch (error) {
      console.error('Flexible validation error:', error);
      return {
        isValid: false,
        errors: [`Row ${rowIndex + 1}: Validation failed - ${error.message}`],
        warnings: [],
        employeeData
      };
    }
  }

  /**
   * More flexible email validation
   */
  isFlexibleEmailFormat(email) {
    if (!email || typeof email !== 'string') return false;
    
    // Basic email pattern - more forgiving
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }

  /**
   * Validate and clean salary
   */
  validateAndCleanSalary(salary) {
    if (!salary) return 0;
    
    // Remove currency symbols and spaces
    const cleaned = String(salary).replace(/[^0-9.]/g, '');
    const number = parseFloat(cleaned);
    
    return isNaN(number) ? 0 : number;
  }

  /**
   * Validate and clean date
   */
  validateAndCleanDate(dateValue) {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }
}

module.exports = FlexibleEmployeeValidationService;
