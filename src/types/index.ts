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
  last_working_date?: string; // Last working date (when status is Inactive)
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

export interface Role {
  roleId: number;
  roleName: string;
  created_at: string;
  updated_at: string;
}

// Recruitment dropdown value types
export type RecruitmentSource = 
  | 'Indeed'
  | 'Candidate Reference'
  | 'Employee Reference'
  | 'Walk-In';

export type RecruitmentPipeline = 
  | 'HR Screening'
  | 'Screening Reject'
  | 'R1'
  | 'R1 Reject'
  | 'R2'
  | 'R2 Reject'
  | 'Offered'
  | 'Onboarded';

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

// Recruitment Panel interfaces
export interface Recruitment {
  id?: number;
  date: string; // dd/mm/yyyy format
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email: string;
  recruitmentSource: RecruitmentSource;
  recruitmentPipeline: RecruitmentPipeline;
  platform?: string; // New platform field
  role?: string; // New role field
  nationality?: string; // Optional for backward compatibility with existing records
  comments?: string; // Optional comments field
  cvFilePath?: string;
  cvOriginalName?: string;
  cvFileSize?: number;
  cvMimeType?: string;
  formattedDate?: string; // For display purposes
  createdAt?: string;
  updatedAt?: string;
}

export interface RecruitmentFormData {
  id?: number;
  date: string; // dd/mm/yyyy format
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email: string;
  recruitmentSource: RecruitmentSource;
  recruitmentPipeline: RecruitmentPipeline;
  platform?: string; // New platform field
  role?: string; // New role field
  comments?: string; // Optional comments field
  cvFile?: File; // For form handling
}

export interface RecruitmentSearchFilters {
  search?: string;
  source?: RecruitmentSource;
  pipeline?: RecruitmentPipeline;
  fullName?: string;
  nationality?: string; // Keep for backward compatibility with existing records
  dateFrom?: string;
  dateTo?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface RecruitmentStatistics {
  total: number;
  bySource: Array<{ recruitmentSource: RecruitmentSource; count: number }>;
  byPipeline: Array<{ recruitmentPipeline: RecruitmentPipeline; count: number }>;
  byNationality?: Array<{ nationality: string; count: number }>; // Optional for backward compatibility
  recentApplications: number;
  thisMonth: number;
}

export interface RecruitmentReferenceData {
  sources: RecruitmentSource[];
  pipelines: RecruitmentPipeline[];
  nationalities: string[]; // Keep for backward compatibility
}

// Petty Cash Management interfaces
export interface Peticash {
  id?: number;
  date: string;
  expense_category: string;
  narration?: string;
  authorised_amount: number;
  comments?: string;
  payable: string;
  created_at?: string;
  updated_at?: string;
}

export interface PeticashFormData extends Peticash {
  // Additional form-specific properties if needed
}

export interface PeticashSummary {
  totalTransactions: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export interface PeticashOptions {
  expenseCategories: Array<{ value: string; label: string }>;
}

export interface PeticashFilters {
  search?: string;
  expense_category?: string;
  payable?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PeticashResponse {
  expenses: Peticash[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}
