/**
 * Peticash Controller - HTTP layer for petty cash expense operations
 * Handles CRUD operations for petty cash management
 */

const { Peticash } = require('../models/Peticash');
const { logAudit } = require('../middleware/auditMiddleware');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { excelDateToYYYYMMDD } = require('../utils/dateUtils');

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
      const { page = 1, limit = 50, search, expense_category, payable } = req.query;
      
      // Ensure page and limit are valid integers
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 50)); // Cap at 1000
      const offset = (pageNum - 1) * limitNum;
      
      let query = 'SELECT * FROM peticash WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM peticash WHERE 1=1';
      let queryParams = [];
      
      // Add search filters
      if (search) {
        query += ' AND (expense_category LIKE ? OR narration LIKE ? OR comments LIKE ?)';
        countQuery += ' AND (expense_category LIKE ? OR narration LIKE ? OR comments LIKE ?)';
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
      }
      
      if (expense_category) {
        query += ' AND expense_category = ?';
        countQuery += ' AND expense_category = ?';
        queryParams.push(expense_category);
      }
      
      if (payable !== undefined && payable !== '') {
        query += ' AND payable = ?';
        countQuery += ' AND payable = ?';
        queryParams.push(payable);
      }
      
      // Add ordering and pagination
      query += ' ORDER BY `date` DESC, created_at DESC LIMIT ? OFFSET ?';
      
      // Ensure parameters are integers, not strings or NaN
      const finalLimit = Number.isInteger(limitNum) ? limitNum : 50;
      const finalOffset = Number.isInteger(offset) ? offset : 0;
      
      queryParams.push(finalLimit, finalOffset);
      
      // Use query() instead of execute() to avoid prepared statement issues
      const [expenses] = await req.db.query(query, queryParams);
      const [countResult] = await req.db.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset for count
      
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
      delete dbData.created_at; // Let database handle timestamp
      delete dbData.updated_at; // Let database handle timestamp
      
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
          SUM(authorised_amount) as total_amount
        FROM peticash WHERE 1=1${dateFilter}`,
        queryParams
      );
      
      // Get expenses by category
      const [categoryResult] = await req.db.execute(
        `SELECT 
          expense_category,
          COUNT(*) as count,
          SUM(authorised_amount) as total_amount
        FROM peticash WHERE 1=1${dateFilter}
        GROUP BY expense_category
        ORDER BY total_amount DESC`,
        queryParams
      );
      
      res.json({
        summary: {
          totalTransactions: totalResult[0].total_transactions || 0,
          totalAmount: parseFloat(totalResult[0].total_amount) || 0
        },
        byCategory: categoryResult
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
      // Get unique expense categories from database
      const [expenseCategories] = await req.db.execute(
        'SELECT DISTINCT expense_category FROM peticash WHERE expense_category IS NOT NULL AND expense_category != "" ORDER BY expense_category'
      );
      
      res.json({
        expenseCategories: expenseCategories.map(row => ({ value: row.expense_category, label: row.expense_category }))
      });
    } catch (error) {
      handleError(res, error, 'Failed to fetch options');
    }
  },

  /**
   * Export petty cash expenses to Excel
   */
  async exportPeticash(req, res) {
    try {
      const [rows] = await req.db.query('SELECT * FROM peticash ORDER BY `date` DESC, created_at DESC');

      const exportData = rows.map(row => {
        const p = Peticash.fromDbFormat(row);
        const json = p.toJSON();
        return {
          'Date': json.date || '',
          'Expense Category': json.expense_category || '',
          'Payable': json.payable || '',
          'Narration': json.narration || '',
          'Authorised Amount': json.authorised_amount || 0,
          'Comments': json.comments || ''
        };
      });

      // Build ExcelJS workbook with formatting
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Petty Cash', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      if (exportData.length === 0) {
        // Still create headers for empty export
        ws.columns = [
          { header: 'Date', key: 'Date', width: 14 },
          { header: 'Expense Category', key: 'Expense Category', width: 22 },
          { header: 'Payable', key: 'Payable', width: 10 },
          { header: 'Narration', key: 'Narration', width: 30 },
          { header: 'Authorised Amount', key: 'Authorised Amount', width: 20 },
          { header: 'Comments', key: 'Comments', width: 30 }
        ];
      } else {
        const headers = Object.keys(exportData[0]);
        const widthMap = { 'Date': 14, 'Expense Category': 22, 'Payable': 10, 'Narration': 30, 'Authorised Amount': 20, 'Comments': 30 };
        ws.columns = headers.map(h => ({ header: h, key: h, width: widthMap[h] || 18 }));
        exportData.forEach(row => ws.addRow(row));
      }

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.height = 22;
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Style data rows with alternating colours
      for (let r = 2; r <= exportData.length + 1; r++) {
        const row = ws.getRow(r);
        const isEven = r % 2 === 0;
        row.eachCell({ includeEmpty: true }, cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
          };
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
          }
          cell.alignment = { vertical: 'middle' };
        });
      }

      // Auto-filter
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        ws.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: exportData.length + 1, column: headers.length }
        };
      }

      const buffer = await wb.xlsx.writeBuffer();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `petty_cash_${timestamp}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.end(buffer);
    } catch (error) {
      handleError(res, error, 'Failed to export petty cash data');
    }
  },

  /**
   * Import petty cash expenses from Excel
   */
  async importPeticash(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) {
        return res.status(400).json({ error: 'Excel file is empty' });
      }

      let imported = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel row number (1-indexed + header)

        try {
          const rawDate = row['Date'];
          const expense_category = String(row['Expense Category'] || '').trim();
          const payable = String(row['Payable'] || '').trim();
          const narration = String(row['Narration'] || '').trim();
          const authorised_amount = parseFloat(row['Authorised Amount']);
          const comments = String(row['Comments'] || '').trim();

          // Convert date from DD/MM/YYYY, serial number, or other formats to YYYY-MM-DD
          const date = rawDate ? excelDateToYYYYMMDD(rawDate) : '';

          if (!date || !expense_category || isNaN(authorised_amount)) {
            errors.push(`Row ${rowNum}: Missing required fields (Date, Expense Category, Authorised Amount)`);
            continue;
          }

          await req.db.execute(
            'INSERT INTO peticash (date, expense_category, payable, narration, authorised_amount, comments) VALUES (?, ?, ?, ?, ?, ?)',
            [date, expense_category, payable || null, narration || null, authorised_amount, comments || null]
          );
          imported++;
        } catch (err) {
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      }

      res.json({
        message: `Import completed. ${imported} of ${rows.length} records imported.`,
        imported,
        total: rows.length,
        errors
      });
    } catch (error) {
      handleError(res, error, 'Failed to import petty cash data');
    }
  }
};

module.exports = peticashController;
