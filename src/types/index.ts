// TypeScript interface definitions for PayRoll Management System data models
// Comprehensive type definitions for employees, payroll, attendance, and other system entities
export interface Employee {
  id: number; // Remove undefined if it's always required
  employeeId: string;
  name: string; // Backend field name (concatenated from first_name + last_name)
  first_name?: string; // New field for form input
  last_name?: string; // New field for form input
  nationality?: string; // New field
  fullName?: string; // Frontend display name (maps to 'name')
  email: string;
  office_id: number;
  office_name: string;
  position_id: number;
  position_name: string;
  monthlySalary: number;
  joiningDate: string;
  status: boolean;
  reporting_time?: string;
  duty_hours?: number;
  position_title?: string; // Optional, if not always present
  dob?: string;
  passport_number?: string;
  passport_expiry?: string;
  visa_type?: number; // This stores the ID
  visa_type_name?: string; // This stores the actual visa type name
  visa_type_id?: number; // For form handling
  platform?: string; // This stores the platform name
  platform_name?: string; // Backend field name for platform
  platform_id?: number; // For form handling
  address?: string; // Permanent address
  current_address?: string; // Current address
  phone?: string;
  gender?: string;
  // New fields added
  whatsapp?: string;
  visa_expiry?: string;
  primary_language?: string;
  secondary_language?: string;
  marital_status?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Other';
  hiring_source?: string;
  salary_currency?: string;
  emirates_id?: string;
  emergency_contact?: string;
  emergency_contact_relation?: string; // New field for emergency contact relation
  shift_timings?: string; // Shift timings (e.g., "9:00 AM - 6:00 PM")
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hoursWorked: number;
  isLate: boolean;
  isHalfDay: boolean;
  isAbsent: boolean;
  approvedLeave?: boolean; // New field for approved leave checkbox
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  office: string;
  month: string;
  year: number;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  leaves: number;
  excessLeaves: number;
  approvedLeaves: number; // New field for approved leaves count
  deductionDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
}

export interface Office {
  id: string;
  name: string;
  location: string;
}

export interface Platform {
  id: number;
  platform_name: string;
  created_at: string;
  employeeCount?: number;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  role: 'admin' | 'hr' | 'floor_manager';
  two_factor_secret?: string;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
  offices?: Office[];
}

export interface PayrollSummary {
  totalEmployees: number;
  totalPayroll: number;
  averageSalary: number;
  totalDeductions: number;
  presentEmployees: number;
  absentEmployees: number;
}

export interface ApprovedLeave {
  id: number;
  employee_id: string;
  date: string;
  approved_by?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvanceSalaryRecord {
  id: number;
  employee_id: string;
  employee_name?: string;
  office_name?: string;
  month_year: string;
  amount: number;
  uploaded_date: string;
  uploaded_by: string;
}
