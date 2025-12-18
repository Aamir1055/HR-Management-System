/**
 * Peticash Data Model
 * Defines the petty cash expenses data structure and database schema mappings
 */

const PeticashSchema = {
  // Primary fields (required)
  id: { type: 'number', required: false, autoIncrement: true },
  date: { type: 'date', required: true },
  company: { type: 'string', required: true },
  expense_category: { type: 'string', required: true },
  payment_type: { type: 'string', required: true },
  disbursed_amount: { type: 'number', required: true },
  comments: { type: 'string', required: false },
  payable: { type: 'boolean', required: true, default: false },
  
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
    'payment_type': 'paymentType',
    'disbursed_amount': 'disbursedAmount',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  },
  
  // Excel column names to model field names (flexible matching)
  excelToModel: {
    'Date': 'date',
    'date': 'date',
    'Company': 'company',
    'company': 'company',
    'Expense Category': 'expense_category',
    'expense_category': 'expense_category',
    'expenseCategory': 'expense_category',
    'Payment Type': 'payment_type',
    'payment_type': 'payment_type',
    'paymentType': 'payment_type',
    'Disbursed Amount': 'disbursed_amount',
    'disbursed_amount': 'disbursed_amount',
    'disbursedAmount': 'disbursed_amount',
    'Amount': 'disbursed_amount',
    'amount': 'disbursed_amount',
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

// Payable status mappings
const PayableStatus = {
  PAID: true,
  UNPAID: false,
  
  fromString: (status) => {
    if (typeof status === 'boolean') return status;
    if (typeof status === 'number') return status === 1;
    if (typeof status === 'string') {
      const lower = status.toLowerCase();
      return (lower === 'paid' || lower === 'true' || lower === '1' || lower === 'yes') ? true : false;
    }
    return false; // Default to unpaid
  },
  
  toString: (status) => {
    return (status === true || status === 1) ? 'Paid' : 'Unpaid';
  },
  
  toBoolean: (status) => {
    return status === true || status === 1 || status === 'paid';
  }
};

// Required fields for different operations
const RequiredFields = {
  create: ['date', 'company', 'expense_category', 'payment_type', 'disbursed_amount', 'payable'],
  update: ['id'], // Only ID required for updates
  import: ['date', 'company', 'expense_category', 'payment_type', 'disbursed_amount', 'payable']
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

    // Validate disbursed amount
    if (this.disbursed_amount !== undefined && 
        (isNaN(this.disbursed_amount) || parseFloat(this.disbursed_amount) < 0)) {
      errors.push('Disbursed amount must be a positive number');
    }

    // Validate payment type (removed strict validation to allow free text)
    // Payment type can now be any non-empty string

    // Validate payable status
    if (this.payable !== undefined && ![0, 1, true, false].includes(this.payable)) {
      errors.push('Payable must be boolean or 0/1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to database format
  toDbFormat() {
    const dbData = { ...this };
    
    // Convert payable to number for database
    if (typeof dbData.payable === 'boolean') {
      dbData.payable = dbData.payable ? 1 : 0;
    }

    // Ensure disbursed_amount is a number
    if (dbData.disbursed_amount && typeof dbData.disbursed_amount !== 'number') {
      dbData.disbursed_amount = parseFloat(dbData.disbursed_amount) || 0;
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
    
    // Convert payable to boolean for frontend
    peticash.payable = PayableStatus.toBoolean(dbData.payable);
    
    return peticash;
  }

  // Sanitize for JSON response
  toJSON() {
    const json = { ...this };
    
    // Ensure boolean payable for frontend
    json.payable = PayableStatus.toBoolean(this.payable);
    
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
  PaymentTypes,
  ExpenseCategories,
  PayableStatus,
  RequiredFields
};
