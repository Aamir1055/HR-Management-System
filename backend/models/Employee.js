/**
 * Employee Data Model
 * Defines the employee data structure and database schema mappings
 */

const EmployeeSchema = {
  // Primary fields (required)
  employeeId: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  first_name: { type: 'string', required: false },
  last_name: { type: 'string', required: false },
  nationality: { type: 'string', required: false },
  email: { type: 'string', required: true, unique: true },
  office_id: { type: 'number', required: true },
  position_id: { type: 'number', required: true },
  monthlySalary: { type: 'number', required: true },
  joiningDate: { type: 'date', required: true },
  status: { type: 'boolean', required: true, default: true },

  // Personal information
  dob: { type: 'date', required: false },
  passport_number: { type: 'string', required: false },
  passport_expiry: { type: 'date', required: false },
  visa_type: { type: 'string', required: false },
  visa_expiry: { type: 'date', required: false },
  platform: { type: 'string', required: false },
  address: { type: 'string', required: false },
  current_address: { type: 'string', required: false },
  phone: { type: 'string', required: false },
  whatsapp: { type: 'string', required: false },
  gender: { type: 'string', required: false },
  primary_language: { type: 'string', required: false },
  secondary_language: { type: 'string', required: false },
  marital_status: { type: 'string', required: false },
  hiring_source: { type: 'string', required: false },
  salary_currency: { type: 'string', required: false, default: 'AED' },
  emirates_id: { type: 'string', required: false },
  emergency_contact: { type: 'string', required: false },
  emergency_contact_relation: { type: 'string', required: false },
  shift_timings: { type: 'string', required: false }
};

const EmployeeTableName = 'employees';

// Field mappings for different contexts
const EmployeeFieldMappings = {
  // Database column names to model field names
  dbToModel: {
    'employee_id': 'employeeId',
    'monthly_salary': 'monthlySalary',
    'joining_date': 'joiningDate',
    'date_of_birth': 'dob'
  },
  
  // Excel column names to model field names (flexible matching)
  excelToModel: {
    'Employee ID': 'employeeId',
    'employee_id': 'employeeId',
    'employeeId': 'employeeId',
    'Full Name': 'name',
  'Full name': 'name',
    'full_name': 'name',
    'Name': 'name',
    'First Name': 'first_name',
    'first_name': 'first_name',
    'firstName': 'first_name',
    'Last Name': 'last_name',
    'last_name': 'last_name',
    'lastName': 'last_name',
    'Email': 'email',
    'email': 'email',
    'Office Name': 'office_name',
    'office_name': 'office_name',
    'officeName': 'office_name',
    'Office': 'office_name',
    'Position Name': 'position_name',
    'position_name': 'position_name',
    'positionName': 'position_name',
    'Position': 'position_name',
    'Salary': 'monthlySalary',
    'salary': 'monthlySalary',
    'monthlySalary': 'monthlySalary',
    'Monthly Salary': 'monthlySalary',
    'Joining Date': 'joiningDate',
    'joining_date': 'joiningDate',
    'joiningDate': 'joiningDate',
    'Date of Joining (DD/MM/YYYY)': 'joiningDate',
    'Date of Joining': 'joiningDate',
    'Status': 'status',
    'status': 'status',
    // Additional mappings for comprehensive Excel support
    'Date of Birth': 'dob',
    'dob': 'dob',
    'DOB': 'dob',
    'Nationality': 'nationality',
    'nationality': 'nationality',
    'Passport Number': 'passport_number',
    'passport_number': 'passport_number',
    'Passport Expiry': 'passport_expiry',
    'passport_expiry': 'passport_expiry',
    'Visa Type': 'visa_type',
    'visa_type': 'visa_type',
    'Visa Expiry': 'visa_expiry',
    'visa_expiry': 'visa_expiry',
    'Platform': 'platform',
    'platform': 'platform',
    'Phone': 'phone',
    'phone': 'phone',
    'WhatsApp': 'whatsapp',
    'whatsapp': 'whatsapp',
    'Gender': 'gender',
    'gender': 'gender',
    'Marital Status': 'marital_status',
    'marital_status': 'marital_status',
    'Primary Language': 'primary_language',
    'primary_language': 'primary_language',
    'Secondary Language': 'secondary_language',
    'secondary_language': 'secondary_language',
    'Hiring Source': 'hiring_source',
    'hiring_source': 'hiring_source',
    'Current Address': 'current_address',
    'current_address': 'current_address',
    'Address': 'address',
    'address': 'address',
    'Shift Timings': 'shift_timings',
    'Shift Time': 'shift_timings',
    'shift_timings': 'shift_timings',
    'shift_time': 'shift_timings',
    'shiftTimings': 'shift_timings',
    'shiftTime': 'shift_timings',
    'Shift': 'shift_timings',
    'Emirates ID': 'emirates_id',
    'emirates_id': 'emirates_id',
    'Emergency Contact': 'emergency_contact',
    'Emergency Contact Details': 'emergency_contact',
    'emergency_contact': 'emergency_contact',
    'Emergency Contact Relation': 'emergency_contact_relation',
    'emergency_contact_relation': 'emergency_contact_relation'
  }
};

// Status mappings
const EmployeeStatus = {
  ACTIVE: 1,
  INACTIVE: 0,
  
  fromString: (status) => {
    if (typeof status === 'boolean') return status ? 1 : 0;
    if (typeof status === 'number') return status;
    if (typeof status === 'string') {
      const lower = status.toLowerCase();
      return (lower === 'active' || lower === 'true' || lower === '1') ? 1 : 0;
    }
    return 1; // Default to active
  },
  
  toString: (status) => {
    return (status === 1 || status === true) ? 'Active' : 'Inactive';
  },
  
  toBoolean: (status) => {
    return status === 1 || status === true || status === 'active';
  }
};

// Required fields for different operations
const RequiredFields = {
  create: ['employeeId', 'name', 'email', 'office_id', 'position_id', 'monthlySalary', 'joiningDate'],
  update: ['employeeId'], // Only employeeId required for updates
  // Import now supports either a single Full Name or First/Last Name.
  // We require 'name' (mapped from "Full Name"/"Name") instead of first/last for broader compatibility.
  import: ['employeeId', 'name', 'email', 'office_name', 'position_name', 'monthlySalary', 'joiningDate', 'status']
};

class Employee {
  constructor(data = {}) {
    Object.keys(EmployeeSchema).forEach(field => {
      const schema = EmployeeSchema[field];
      this[field] = data[field] !== undefined ? data[field] : schema.default;
    });
  }

  // Validate employee data against schema
  validate(operation = 'create') {
    const errors = [];
    const requiredFields = RequiredFields[operation] || RequiredFields.create;

    // Check required fields
    requiredFields.forEach(field => {
      if (!this[field] || (typeof this[field] === 'string' && this[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    });

    // Validate email format
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Invalid email format');
    }

    // Validate status
    if (this.status !== undefined && ![0, 1, true, false].includes(this.status)) {
      errors.push('Status must be boolean or 0/1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to database format
  toDbFormat() {
    const dbData = { ...this };
    
    // Convert status to number
    if (typeof dbData.status === 'boolean') {
      dbData.status = dbData.status ? 1 : 0;
    }

    // Ensure salary is a number
    if (dbData.monthlySalary && typeof dbData.monthlySalary !== 'number') {
      dbData.monthlySalary = parseFloat(dbData.monthlySalary) || 0;
    }

    return dbData;
  }

  // Convert from database format
  static fromDbFormat(dbData) {
    if (!dbData) return null;
    
    const employee = new Employee(dbData);
    
    // Convert status to boolean for frontend
    employee.status = EmployeeStatus.toBoolean(dbData.status);
    
    return employee;
  }

  // Generate full name from first and last name
  generateFullName() {
    const firstName = this.first_name || '';
    const lastName = this.last_name || '';
    this.name = `${firstName} ${lastName}`.trim() || this.name;
    return this.name;
  }

  // Sanitize for JSON response
  toJSON() {
    const json = { ...this };
    
    // Ensure boolean status for frontend
    json.status = EmployeeStatus.toBoolean(this.status);
    
    return json;
  }
}

module.exports = {
  Employee,
  EmployeeSchema,
  EmployeeTableName,
  EmployeeFieldMappings,
  EmployeeStatus,
  RequiredFields
};
