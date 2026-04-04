/**
 * Peticash Data Model
 * Defines the petty cash expenses data structure and database schema mappings
 */

const PeticashSchema = {
  // Primary fields (required)
  id: { type: 'number', required: false, autoIncrement: true },
  date: { type: 'date', required: true },
  expense_category: { type: 'string', required: true },
  narration: { type: 'string', required: false },
  authorised_amount: { type: 'number', required: true },
  comments: { type: 'string', required: false },
  payable: { type: 'string', required: true, default: '' },
  
  // Audit fields
  created_at: { type: 'datetime', required: false, default: 'CURRENT_TIMESTAMP' },
  updated_at: { type: 'datetime', required: false, default: 'CURRENT_TIMESTAMP' }
};

const PeticashTableName = 'peticash';

// Field mappings for different contexts
const PeticashFieldMappings = {
  // Database column names to model field names
  dbToModel: {
    'expense_category': 'expenseCategory',
    'authorised_amount': 'authorisedAmount',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  },
  
  // Excel column names to model field names (flexible matching)
  excelToModel: {
    'Date': 'date',
    'date': 'date',
    'Expense Category': 'expense_category',
    'expense_category': 'expense_category',
    'expenseCategory': 'expense_category',
    'Narration': 'narration',
    'narration': 'narration',
    'Authorised Amount': 'authorised_amount',
    'authorised_amount': 'authorised_amount',
    'authorisedAmount': 'authorised_amount',
    'Amount': 'authorised_amount',
    'amount': 'authorised_amount',
    'Comments': 'comments',
    'comments': 'comments',
    'Payable': 'payable',
    'payable': 'payable'
  }
};

// Payment type options
const PaymentTypes = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
  CARD: 'card',
  
  getAll: () => [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' }
  ]
};

// Expense category options
const ExpenseCategories = {
  OFFICE_SUPPLIES: 'office_supplies',
  TRAVEL: 'travel',
  MEALS: 'meals',
  UTILITIES: 'utilities',
  MAINTENANCE: 'maintenance',
  MISCELLANEOUS: 'miscellaneous',
  
  getAll: () => [
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'travel', label: 'Travel' },
    { value: 'meals', label: 'Meals' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'miscellaneous', label: 'Miscellaneous' }
  ]
};

// Payable status mappings (kept for backward compatibility)
const PayableStatus = {
  fromString: (status) => String(status || ''),
  toString: (status) => String(status || ''),
  toValue: (status) => String(status || '')
};

// Required fields for different operations
const RequiredFields = {
  create: ['date', 'expense_category', 'authorised_amount', 'payable'],
  update: ['id'], // Only ID required for updates
  import: ['date', 'expense_category', 'authorised_amount', 'payable']
};

class Peticash {
  constructor(data = {}) {
    Object.keys(PeticashSchema).forEach(field => {
      const schema = PeticashSchema[field];
      this[field] = data[field] !== undefined ? data[field] : schema.default;
    });
  }

  // Validate peticash data against schema
  validate(operation = 'create') {
    const errors = [];
    const requiredFields = RequiredFields[operation] || RequiredFields.create;

    // Check required fields
    requiredFields.forEach(field => {
      if (this[field] === undefined || this[field] === null || 
          (typeof this[field] === 'string' && this[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    });

    // Validate date format
    if (this.date && isNaN(Date.parse(this.date))) {
      errors.push('Invalid date format');
    }

    // Validate authorised amount
    if (this.authorised_amount !== undefined && 
        (isNaN(this.authorised_amount) || parseFloat(this.authorised_amount) < 0)) {
      errors.push('Authorised amount must be a positive number');
    }

    // Validate payable - can be any string or number
    if (this.payable !== undefined && this.payable !== null && String(this.payable).trim() === '') {
      errors.push('Payable is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to database format
  toDbFormat() {
    const dbData = { ...this };
    
    // Ensure payable is stored as string
    if (dbData.payable !== undefined && dbData.payable !== null) {
      dbData.payable = String(dbData.payable);
    }

    // Ensure authorised_amount is a number
    if (dbData.authorised_amount && typeof dbData.authorised_amount !== 'number') {
      dbData.authorised_amount = parseFloat(dbData.authorised_amount) || 0;
    }

    // Format date for database
    if (dbData.date && typeof dbData.date === 'string') {
      dbData.date = new Date(dbData.date).toISOString().split('T')[0];
    }

    return dbData;
  }

  // Convert from database format
  static fromDbFormat(dbData) {
    if (!dbData) return null;
    
    const peticash = new Peticash(dbData);
    
    // Keep payable as string
    peticash.payable = String(dbData.payable || '');
    
    return peticash;
  }

  // Sanitize for JSON response
  toJSON() {
    const json = { ...this };
    
    // Keep payable as string
    json.payable = String(this.payable || '');
    
    // Format date for frontend
    if (json.date && typeof json.date === 'object') {
      json.date = json.date.toISOString().split('T')[0];
    }
    
    return json;
  }
}

module.exports = {
  Peticash,
  PeticashSchema,
  PeticashTableName,
  PeticashFieldMappings,
  PayableStatus,
  RequiredFields
};
