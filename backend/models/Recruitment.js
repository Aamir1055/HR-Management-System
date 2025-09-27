/**
 * Recruitment Data Model
 * Defines the recruitment panel data structure and database schema mappings
 */

const RecruitmentSchema = {
  // Primary fields
  id: { type: 'number', required: false, autoIncrement: true },
  date: { type: 'date', required: true },
  fullName: { type: 'string', required: true, maxLength: 255 },
  mobile: { type: 'string', required: true, maxLength: 20 },
  whatsapp: { type: 'string', required: false, maxLength: 20 },
  email: { type: 'string', required: true, unique: true, maxLength: 255 },
  recruitmentSource: { type: 'string', required: true, maxLength: 100 },
  recruitmentPipeline: { type: 'string', required: true, maxLength: 100 },
  nationality: { type: 'string', required: true, maxLength: 100 },
  cvFilePath: { type: 'string', required: false, maxLength: 500 },
  cvOriginalName: { type: 'string', required: false, maxLength: 255 },
  cvFileSize: { type: 'number', required: false },
  cvMimeType: { type: 'string', required: false, maxLength: 100 },
  
  // Timestamps
  createdAt: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP' },
  updatedAt: { type: 'timestamp', required: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
};

const RecruitmentTableName = 'recruitments';

// Recruitment sources enum
const RecruitmentSources = {
  LINKEDIN: 'LinkedIn',
  INDEED: 'Indeed',
  BAYT: 'Bayt.com',
  NAUKRI_GULF: 'Naukri Gulf',
  COMPANY_WEBSITE: 'Company Website',
  EMPLOYEE_REFERRAL: 'Employee Referral',
  RECRUITMENT_AGENCY: 'Recruitment Agency',
  WALK_IN: 'Walk-in',
  JOB_FAIR: 'Job Fair',
  SOCIAL_MEDIA: 'Social Media',
  OTHER: 'Other',
  
  getAll: () => Object.values(RecruitmentSources).filter(value => typeof value === 'string')
};

// Recruitment pipeline stages
const RecruitmentPipelines = {
  APPLICATION_RECEIVED: 'Application Received',
  SCREENING: 'Initial Screening',
  PHONE_INTERVIEW: 'Phone Interview',
  TECHNICAL_ASSESSMENT: 'Technical Assessment',
  FIRST_INTERVIEW: 'First Interview',
  SECOND_INTERVIEW: 'Second Interview',
  FINAL_INTERVIEW: 'Final Interview',
  REFERENCE_CHECK: 'Reference Check',
  OFFER_EXTENDED: 'Offer Extended',
  OFFER_ACCEPTED: 'Offer Accepted',
  OFFER_DECLINED: 'Offer Declined',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  HIRED: 'Hired',
  
  getAll: () => Object.values(RecruitmentPipelines).filter(value => typeof value === 'string')
};

// Common nationalities for dropdown
const CommonNationalities = [
  'UAE', 'Saudi Arabia', 'India', 'Pakistan', 'Bangladesh', 'Philippines', 'Egypt',
  'Jordan', 'Lebanon', 'Syria', 'Palestine', 'Sudan', 'Yemen', 'Oman', 'Kuwait',
  'Qatar', 'Bahrain', 'Iran', 'Afghanistan', 'Turkey', 'United States', 'United Kingdom',
  'Canada', 'Australia', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
  'South Africa', 'Nigeria', 'Kenya', 'Other'
];

// File validation constants
const FileValidation = {
  MAX_SIZE: 15 * 1024 * 1024, // 15MB in bytes
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
};

// Required fields for different operations
const RequiredFields = {
  create: ['date', 'fullName', 'mobile', 'email', 'recruitmentSource', 'recruitmentPipeline', 'nationality'],
  update: ['id'], // Only ID required for updates
  search: [] // No required fields for search
};

class Recruitment {
  constructor(data = {}) {
    Object.keys(RecruitmentSchema).forEach(field => {
      const schema = RecruitmentSchema[field];
      this[field] = data[field] !== undefined ? data[field] : schema.default;
    });
  }

  // Validate recruitment data against schema
  validate(operation = 'create') {
    const errors = [];
    const warnings = [];
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

    // Validate mobile number format (basic validation)
    if (this.mobile && !/^[\+]?[0-9\-\(\)\s]{7,20}$/.test(this.mobile)) {
      errors.push('Invalid mobile number format');
    }

    // Validate whatsapp number format if provided
    if (this.whatsapp && !/^[\+]?[0-9\-\(\)\s]{7,20}$/.test(this.whatsapp)) {
      errors.push('Invalid WhatsApp number format');
    }

    // Validate date format
    if (this.date) {
      let dateObj;
      
      // Handle DD/MM/YYYY format
      if (typeof this.date === 'string' && this.date.includes('/')) {
        const [day, month, year] = this.date.split('/');
        if (day && month && year && day.length <= 2 && month.length <= 2 && year.length === 4) {
          // Create date in YYYY-MM-DD format for proper validation
          dateObj = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        } else {
          dateObj = new Date(this.date);
        }
      } else {
        dateObj = new Date(this.date);
      }
      
      if (isNaN(dateObj.getTime())) {
        errors.push('Invalid date format. Expected DD/MM/YYYY format');
      } else if (dateObj > new Date()) {
        warnings.push('Date is in the future');
      }
    }

    // Validate recruitment source
    if (this.recruitmentSource && !RecruitmentSources.getAll().includes(this.recruitmentSource)) {
      warnings.push(`Recruitment source '${this.recruitmentSource}' is not in the predefined list`);
    }

    // Validate recruitment pipeline
    if (this.recruitmentPipeline && !RecruitmentPipelines.getAll().includes(this.recruitmentPipeline)) {
      warnings.push(`Recruitment pipeline '${this.recruitmentPipeline}' is not in the predefined list`);
    }

    // Validate nationality
    if (this.nationality && !CommonNationalities.includes(this.nationality)) {
      warnings.push(`Nationality '${this.nationality}' is not in the common list`);
    }

    // Validate CV file if provided
    if (this.cvFileSize && this.cvFileSize > FileValidation.MAX_SIZE) {
      errors.push(`CV file size exceeds maximum limit of ${FileValidation.MAX_SIZE / (1024 * 1024)}MB`);
    }

    if (this.cvMimeType && !FileValidation.ALLOWED_TYPES.includes(this.cvMimeType)) {
      errors.push('CV file type not allowed. Allowed types: PDF, DOC, DOCX, JPG, JPEG, PNG');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Convert to database format
  toDbFormat() {
    const dbData = { ...this };
    
    // Format date for database
    if (dbData.date && typeof dbData.date === 'string') {
      // Handle dd/mm/yyyy format
      if (dbData.date.includes('/')) {
        const [day, month, year] = dbData.date.split('/');
        if (day && month && year) {
          dbData.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }

    // Remove undefined fields
    Object.keys(dbData).forEach(key => {
      if (dbData[key] === undefined) {
        delete dbData[key];
      }
    });

    return dbData;
  }

  // Convert from database format
  static fromDbFormat(dbData) {
    if (!dbData) return null;
    
    const recruitment = new Recruitment(dbData);
    
    // Format date for frontend (dd/mm/yyyy)
    if (recruitment.date) {
      const dateObj = new Date(recruitment.date);
      if (!isNaN(dateObj.getTime())) {
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        recruitment.formattedDate = `${day}/${month}/${year}`;
      }
    }
    
    return recruitment;
  }

  // Sanitize for JSON response
  toJSON() {
    const json = { ...this };
    
    // Add formatted date
    if (this.date) {
      const dateObj = new Date(this.date);
      if (!isNaN(dateObj.getTime())) {
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        json.formattedDate = `${day}/${month}/${year}`;
      }
    }
    
    return json;
  }

  // Get file info for response
  getFileInfo() {
    if (!this.cvFilePath) return null;
    
    return {
      fileName: this.cvOriginalName,
      fileSize: this.cvFileSize,
      fileType: this.cvMimeType,
      filePath: this.cvFilePath
    };
  }
}

module.exports = {
  Recruitment,
  RecruitmentSchema,
  RecruitmentTableName,
  RecruitmentSources,
  RecruitmentPipelines,
  CommonNationalities,
  FileValidation,
  RequiredFields
};
