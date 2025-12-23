/**
 * Half Day Waiver Controller - Manages half day waivers as tokens of grace
 * Allows administrators to waive half day deductions for employees
 */
console.log("==> halfDayWaiverController.js loaded");

const db = require('../db');
const moment = require('moment');

/**
 * Toggle half day waiver for a specific employee and date
 * @route POST/DELETE /api/half-day-waivers/toggle
 */
const toggleHalfDayWaiver = async (req, res) => {
  try {
    // Handle both string and object req.body (null prototype issue)
    let body;
    try {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = JSON.parse(JSON.stringify(req.body));
      }
    } catch (e) {
      console.error('Error parsing half day waiver request body:', e);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request data' 
      });
    }

    const { employee_id, date, reason } = body;

    console.log('🔍 TOGGLE HALF DAY WAIVER - Body:', body);
    console.log('🔍 TOGGLE HALF DAY WAIVER - employee_id:', employee_id, 'date:', date, 'reason:', reason);
    
    if (!employee_id || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID and date are required' 
      });
    }

    // Validate date format
    const formattedDate = moment(date).format('YYYY-MM-DD');
    if (!moment(formattedDate).isValid()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format' 
      });
    }

    // Check if employee exists
    const [empCheck] = await db.query(
      'SELECT employeeId, name FROM employees WHERE employeeId = ?',
      [employee_id]
    );
    
    if (empCheck.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    const employee = empCheck[0];

    // Check if waiver already exists
    const [existingWaiver] = await db.query(
      'SELECT id FROM half_day_waivers WHERE employee_id = ? AND date = ?',
      [employee_id, formattedDate]
    );

    const waivedBy = req.user?.username || req.user?.name || 'Admin';
    
    if (existingWaiver.length > 0) {
      // Remove existing waiver
      await db.query(
        'DELETE FROM half_day_waivers WHERE employee_id = ? AND date = ?',
        [employee_id, formattedDate]
      );
      
      res.json({
        success: true,
        action: 'removed',
        message: `Half day waiver removed for ${employee.name} on ${formattedDate}`,
        data: {
          employee_id,
          employee_name: employee.name,
          date: formattedDate,
          waived: false
        }
      });
    } else {
      // Add new waiver
      const waiverReason = reason || 'Administrative grace - Half day waived';
      
      await db.query(
        `INSERT INTO half_day_waivers (employee_id, date, waived_by, reason) 
         VALUES (?, ?, ?, ?)`,
        [employee_id, formattedDate, waivedBy, waiverReason]
      );
      
      res.json({
        success: true,
        action: 'added',
        message: `Half day waiver granted for ${employee.name} on ${formattedDate}`,
        data: {
          employee_id,
          employee_name: employee.name,
          date: formattedDate,
          waived: true,
          waived_by: waivedBy,
          reason: waiverReason
        }
      });
    }

  } catch (error) {
    console.error('Error toggling half day waiver:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to toggle half day waiver', 
      error: error.message 
    });
  }
};

/**
 * Get all half day waivers for a specific employee and date range
 * @route GET /api/half-day-waivers/:employeeId
 */
const getHalfDayWaivers = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, month, fromDate, toDate } = req.query;

    let query = `
      SELECT hw.*, e.name as employee_name 
      FROM half_day_waivers hw
      INNER JOIN employees e ON hw.employee_id = e.employeeId
      WHERE hw.employee_id = ?
    `;
    let params = [employeeId];

    // Add date filtering
    if (year && month) {
      query += ' AND YEAR(hw.date) = ? AND MONTH(hw.date) = ?';
      params.push(parseInt(year), parseInt(month));
    } else if (fromDate && toDate) {
      query += ' AND hw.date BETWEEN ? AND ?';
      params.push(
        moment(fromDate).format('YYYY-MM-DD'),
        moment(toDate).format('YYYY-MM-DD')
      );
    }

    query += ' ORDER BY hw.date DESC';

    const [waivers] = await db.query(query, params);

    res.json({
      success: true,
      data: waivers
    });

  } catch (error) {
    console.error('Error fetching half day waivers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch half day waivers', 
      error: error.message 
    });
  }
};

/**
 * Get half day waiver status for multiple employee-date combinations
 * @route POST /api/half-day-waivers/batch-status
 */
const getBatchWaiverStatus = async (req, res) => {
  try {
    const { employeeId, dates } = req.body;

    if (!employeeId || !Array.isArray(dates)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee ID and dates array are required' 
      });
    }

    if (dates.length === 0) {
      return res.json({ success: true, data: {} });
    }

    // Format dates and create query
    const formattedDates = dates.map(date => moment(date).format('YYYY-MM-DD'));
    const placeholders = formattedDates.map(() => '?').join(',');
    
    const [waivers] = await db.query(
      `SELECT date, waived_by, reason, created_at 
       FROM half_day_waivers 
       WHERE employee_id = ? AND date IN (${placeholders})`,
      [employeeId, ...formattedDates]
    );

    // Create a map for quick lookup
    const waiverMap = {};
    waivers.forEach(waiver => {
      const dateKey = moment(waiver.date).format('YYYY-MM-DD');
      waiverMap[dateKey] = {
        waived: true,
        waived_by: waiver.waived_by,
        reason: waiver.reason,
        created_at: waiver.created_at
      };
    });

    // Ensure all requested dates are included
    formattedDates.forEach(date => {
      if (!waiverMap[date]) {
        waiverMap[date] = { waived: false };
      }
    });

    res.json({
      success: true,
      data: waiverMap
    });

  } catch (error) {
    console.error('Error fetching batch waiver status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch waiver status', 
      error: error.message 
    });
  }
};

/**
 * Get all half day waivers (admin view)
 * @route GET /api/half-day-waivers/all
 */
const getAllHalfDayWaivers = async (req, res) => {
  try {
    const { year, month, office, limit = 100 } = req.query;

    let query = `
      SELECT hw.*, e.name as employee_name, o.name as office_name
      FROM half_day_waivers hw
      INNER JOIN employees e ON hw.employee_id = e.employeeId
      LEFT JOIN offices o ON e.office_id = o.id
      WHERE 1=1
    `;
    let params = [];

    // Add filters
    if (year && month) {
      query += ' AND YEAR(hw.date) = ? AND MONTH(hw.date) = ?';
      params.push(parseInt(year), parseInt(month));
    }

    if (office) {
      query += ' AND o.id = ?';
      params.push(office);
    }

    query += ' ORDER BY hw.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [waivers] = await db.query(query, params);

    res.json({
      success: true,
      data: waivers,
      count: waivers.length
    });

  } catch (error) {
    console.error('Error fetching all half day waivers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch all waivers', 
      error: error.message 
    });
  }
};

/**
 * Delete a specific half day waiver
 * @route DELETE /api/half-day-waivers/:waiverId
 */
const deleteHalfDayWaiver = async (req, res) => {
  try {
    const { waiverId } = req.params;

    const [result] = await db.query(
      'DELETE FROM half_day_waivers WHERE id = ?',
      [waiverId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Waiver not found' 
      });
    }

    res.json({
      success: true,
      message: 'Half day waiver deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting half day waiver:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete waiver', 
      error: error.message 
    });
  }
};

module.exports = {
  toggleHalfDayWaiver,
  getHalfDayWaivers,
  getBatchWaiverStatus,
  getAllHalfDayWaivers,
  deleteHalfDayWaiver
};
