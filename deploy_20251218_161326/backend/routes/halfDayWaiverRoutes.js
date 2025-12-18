/**
 * Half Day Waiver Routes
 * API routes for managing half day waivers (tokens of grace)
 */
const express = require('express');
const router = express.Router();
const { 
  toggleHalfDayWaiver,
  getHalfDayWaivers,
  getBatchWaiverStatus,
  getAllHalfDayWaivers,
  deleteHalfDayWaiver
} = require('../controllers/halfDayWaiverController');

const { requireAuth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

// Toggle half day waiver (add/remove)
router.post('/toggle', toggleHalfDayWaiver);

// Get waivers for a specific employee
router.get('/:employeeId', getHalfDayWaivers);

// Get waiver status for multiple dates (batch)
router.post('/batch-status', getBatchWaiverStatus);

// Get all waivers (admin view)
router.get('/all/list', getAllHalfDayWaivers);

// Delete specific waiver by ID
router.delete('/waiver/:waiverId', deleteHalfDayWaiver);

// Delete waiver by employee and date (convenience route)
router.delete('/:employeeId/:date', async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    const formattedDate = require('moment')(date).format('YYYY-MM-DD');
    
    const db = require('../db');
    const [result] = await db.query(
      'DELETE FROM half_day_waivers WHERE employee_id = ? AND date = ?',
      [employeeId, formattedDate]
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
});

module.exports = router;
