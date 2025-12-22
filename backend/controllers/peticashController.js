/**
 * Peticash Controller - HTTP layer for petty cash expense operations
 * Handles CRUD operations for petty cash management
 */

const { Peticash, PaymentTypes, ExpenseCategories } = require('../models/Peticash');

/**
 * Handle HTTP errors consistently
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 */
function handleError(res, error, defaultMessage = 'Internal server error') {
  console.error('Peticash Controller error:', error);
  
  // Handle validation errors
  if (error.validationErrors) {
    return res.status(400).json({
      error: error.message,
      validationErrors: error.validationErrors
    });
  }
  
  // Handle known application errors
  if (error.message.includes('not found')) {
    return res.status(404).json({ error: error.message });
  }
  
  if (error.message.includes('Access denied') || error.message.includes('permission')) {
    return res.status(403).json({ error: error.message });
  }
  
  // Handle database/server errors
  res.status(500).json({
    error: defaultMessage,
    details: error.message
  });
}

const peticashController = {
  
  /**
   * Get all petty cash expenses
   */
  async getAllPeticash(req, res) {
    try {
      const { page = 1, limit = 50, search, company, expense_category, payment_type, payable } = req.query;
      
      // Ensure page and limit are valid integers
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 50)); // Cap at 1000
      const offset = (pageNum - 1) * limitNum;
      
      console.log('Petty cash query params:', { page, limit, pageNum, limitNum, offset });
      
      let query = 'SELECT * FROM peticash WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM peticash WHERE 1=1';
      let queryParams = [];
      
      // Add search filters
      if (search) {
        query += ' AND (company LIKE ? OR expense_category LIKE ? OR comments LIKE ?)';
        countQuery += ' AND (company LIKE ? OR expense_category LIKE ? OR comments LIKE ?)';
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
      }
      
      if (company) {
        query += ' AND company = ?';
        countQuery += ' AND company = ?';
        queryParams.push(company);
      }
      
      if (expense_category) {
        query += ' AND expense_category = ?';
        countQuery += ' AND expense_category = ?';
        queryParams.push(expense_category);
      }
      
      if (payment_type) {
        query += ' AND payment_type = ?';
        countQuery += ' AND payment_type = ?';
        queryParams.push(payment_type);
      }
      
      if (payable !== undefined) {
        const payableValue = payable === 'true' ? 1 : 0;
        query += ' AND payable = ?';
        countQuery += ' AND payable = ?';
        queryParams.push(payableValue);
      }
      
      // Add ordering and pagination
      query += ' ORDER BY `date` DESC, created_at DESC LIMIT ? OFFSET ?';
      
      // Ensure parameters are integers, not strings or NaN
      const finalLimit = Number.isInteger(limitNum) ? limitNum : 50;
      const finalOffset = Number.isInteger(offset) ? offset : 0;
      
      queryParams.push(finalLimit, finalOffset);
      
      console.log('Executing query with params:', { query, queryParams });
      
      // Execute queries
      const [expenses] = await req.db.execute(query, queryParams);
      const [countResult] = await req.db.execute(countQuery, queryParams.slice(0, -2)); // Remove limit and offset for count
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / finalLimit);
      
      // Convert to model format
      const formattedExpenses = expenses.map(expense => {
        const peticash = Peticash.fromDbFormat(expense);
        return peticash.toJSON();
      });
      
      res.json({
        expenses: formattedExpenses,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: finalLimit
        }
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch petty cash expenses');
    }
  },
  
  /**
   * Get petty cash expense by ID
   */
  async getPeticashById(req, res) {
    try {
      const { id } = req.params;
      
      const [rows] = await req.db.execute(
        'SELECT * FROM peticash WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Petty cash expense not found' });
      }
      
      const peticash = Peticash.fromDbFormat(rows[0]);
      res.json(peticash.toJSON());
    } catch (error) {
      handleError(res, error, 'Failed to fetch petty cash expense');
    }
  },
  
  /**
   * Create new petty cash expense
   */
  async createPeticash(req, res) {
    try {
      console.log('🔍 CREATE PETICASH - Raw request body:', req.body);
      
      const peticash = new Peticash(req.body);
      const validation = peticash.validate('create');
      
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          validationErrors: validation.errors
        });
      }
      
      const dbData = peticash.toDbFormat();
      delete dbData.id; // Remove ID for insert
      
      const columns = Object.keys(dbData).join(', ');
      const placeholders = Object.keys(dbData).map(() => '?').join(', ');
      const values = Object.values(dbData);
      
      const [result] = await req.db.execute(
        `INSERT INTO peticash (${columns}) VALUES (${placeholders})`,
        values
      );
      
      // Fetch the created record
      const [newRecord] = await req.db.execute(
        'SELECT * FROM peticash WHERE id = ?',
        [result.insertId]
      );
      
      const createdPeticash = Peticash.fromDbFormat(newRecord[0]);
      res.status(201).json(createdPeticash.toJSON());
    } catch (error) {
      handleError(res, error, 'Failed to create petty cash expense');
    }
  },
  
  /**
   * Update existing petty cash expense
   */
  async updatePeticash(req, res) {
    try {
      const { id } = req.params;
      
      console.log('🔍 UPDATE PETICASH - Raw request body:', req.body);
      
      // Check if record exists
      const [existingRows] = await req.db.execute(
        'SELECT * FROM peticash WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Petty cash expense not found' });
      }
      
      const peticash = new Peticash({ ...existingRows[0], ...req.body });
      const validation = peticash.validate('update');
      
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          validationErrors: validation.errors
        });
      }
      
      const dbData = peticash.toDbFormat();
      delete dbData.id; // Remove ID from update data
      delete dbData.created_at; // Don't update created_at
      dbData.updated_at = new Date(); // Update timestamp
      
      const updateFields = Object.keys(dbData).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(dbData), id];
      
      await req.db.execute(
        `UPDATE peticash SET ${updateFields} WHERE id = ?`,
        values
      );
      
      // Fetch the updated record
      const [updatedRows] = await req.db.execute(
        'SELECT * FROM peticash WHERE id = ?',
        [id]
      );
      
      const updatedPeticash = Peticash.fromDbFormat(updatedRows[0]);
      res.json(updatedPeticash.toJSON());
    } catch (error) {
      handleError(res, error, 'Failed to update petty cash expense');
    }
  },
  
  /**
   * Delete petty cash expense
   */
  async deletePeticash(req, res) {
    try {
      const { id } = req.params;
      
      // Check if record exists
      const [existingRows] = await req.db.execute(
        'SELECT * FROM peticash WHERE id = ?',
        [id]
      );
      
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Petty cash expense not found' });
      }
      
      await req.db.execute('DELETE FROM peticash WHERE id = ?', [id]);
      
      res.json({ message: 'Petty cash expense deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete petty cash expense');
    }
  },
  
  /**
   * Get summary statistics
   */
  async getPeticashSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      let dateFilter = '';
      let queryParams = [];
      
      if (startDate && endDate) {
        dateFilter = ' AND date BETWEEN ? AND ?';
        queryParams.push(startDate, endDate);
      }
      
      // Get total expenses
      const [totalResult] = await req.db.execute(
        `SELECT 
          COUNT(*) as total_transactions,
          SUM(disbursed_amount) as total_amount,
          SUM(CASE WHEN payable = 1 THEN disbursed_amount ELSE 0 END) as paid_amount,
          SUM(CASE WHEN payable = 0 THEN disbursed_amount ELSE 0 END) as unpaid_amount
        FROM peticash WHERE 1=1${dateFilter}`,
        queryParams
      );
      
      // Get expenses by category
      const [categoryResult] = await req.db.execute(
        `SELECT 
          expense_category,
          COUNT(*) as count,
          SUM(disbursed_amount) as total_amount
        FROM peticash WHERE 1=1${dateFilter}
        GROUP BY expense_category
        ORDER BY total_amount DESC`,
        queryParams
      );
      
      // Get expenses by payment type
      const [paymentResult] = await req.db.execute(
        `SELECT 
          payment_type,
          COUNT(*) as count,
          SUM(disbursed_amount) as total_amount
        FROM peticash WHERE 1=1${dateFilter}
        GROUP BY payment_type
        ORDER BY total_amount DESC`,
        queryParams
      );
      
      res.json({
        summary: {
          totalTransactions: totalResult[0].total_transactions || 0,
          totalAmount: parseFloat(totalResult[0].total_amount) || 0,
          paidAmount: parseFloat(totalResult[0].paid_amount) || 0,
          unpaidAmount: parseFloat(totalResult[0].unpaid_amount) || 0
        },
        byCategory: categoryResult,
        byPaymentType: paymentResult
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch petty cash summary');
    }
  },
  
  /**
   * Get available options for dropdowns
   */
  async getOptions(req, res) {
    try {
      // Get unique companies from database
      const [companies] = await req.db.execute(
        'SELECT DISTINCT company FROM peticash WHERE company IS NOT NULL AND company != "" ORDER BY company'
      );
      
      // Get unique expense categories from database
      const [expenseCategories] = await req.db.execute(
        'SELECT DISTINCT expense_category FROM peticash WHERE expense_category IS NOT NULL AND expense_category != "" ORDER BY expense_category'
      );
      
      // Get unique payment types from database
      const [paymentTypes] = await req.db.execute(
        'SELECT DISTINCT payment_type FROM peticash WHERE payment_type IS NOT NULL AND payment_type != "" ORDER BY payment_type'
      );
      
      res.json({
        paymentTypes: paymentTypes.map(row => ({ value: row.payment_type, label: row.payment_type })),
        expenseCategories: expenseCategories.map(row => ({ value: row.expense_category, label: row.expense_category })),
        companies: companies.map(row => ({ value: row.company, label: row.company }))
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch options');
    }
  }
};

module.exports = peticashController;
