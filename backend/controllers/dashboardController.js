/**
 * Dashboard Controller - Manages dashboard data and employee celebrations
 * Handles birthday and work anniversary tracking for active employees
 */

// Helper function to format date as DD/MM
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
};

// Helper function to calculate years
const calculateYears = (startDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const today = new Date();
  let years = today.getFullYear() - start.getFullYear();
  const monthDiff = today.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < start.getDate())) {
    years--;
  }
  return years;
};

module.exports = {
  // Get today's celebrations and upcoming birthdays/anniversaries for current month
  getCelebrations: async (req, res) => {
    try {
      const db = req.db;
      if (!db) {
        return res.status(500).json({ error: 'Database connection not available' });
      }

      const today = new Date();
      const currentMonth = today.getMonth() + 1; // 1-12
      const currentDate = today.getDate();

      // Get today's birthdays
      const [todayBirthdays] = await db.query(`
        SELECT 
          id,
          employeeId,
          CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN CONCAT(first_name, ' ', last_name)
            WHEN first_name IS NOT NULL THEN first_name
            WHEN last_name IS NOT NULL THEN last_name
            ELSE name
          END AS full_name,
          dob,
          office_id
        FROM employees 
        WHERE status = 1 
          AND dob IS NOT NULL 
          AND MONTH(dob) = ?
          AND DAY(dob) = ?
        ORDER BY full_name
      `, [currentMonth, currentDate]);

      // Get today's work anniversaries
      const [todayAnniversaries] = await db.query(`
        SELECT 
          id,
          employeeId,
          CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN CONCAT(first_name, ' ', last_name)
            WHEN first_name IS NOT NULL THEN first_name
            WHEN last_name IS NOT NULL THEN last_name
            ELSE name
          END AS full_name,
          joiningDate,
          office_id
        FROM employees 
        WHERE status = 1 
          AND joiningDate IS NOT NULL 
          AND MONTH(joiningDate) = ?
          AND DAY(joiningDate) = ?
          AND YEAR(joiningDate) < YEAR(CURDATE())
        ORDER BY full_name
      `, [currentMonth, currentDate]);

      // Get upcoming birthdays (next 5 in current month, excluding today)
      const [upcomingBirthdays] = await db.query(`
        SELECT 
          id,
          employeeId,
          CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN CONCAT(first_name, ' ', last_name)
            WHEN first_name IS NOT NULL THEN first_name
            WHEN last_name IS NOT NULL THEN last_name
            ELSE name
          END AS full_name,
          dob,
          office_id,
          DAY(dob) AS day_of_month
        FROM employees 
        WHERE status = 1 
          AND dob IS NOT NULL 
          AND MONTH(dob) = ?
          AND DAY(dob) > ?
        ORDER BY day_of_month ASC
        LIMIT 5
      `, [currentMonth, currentDate]);

      // Get upcoming work anniversaries (next 5 in current month, excluding today)
      const [upcomingAnniversaries] = await db.query(`
        SELECT 
          id,
          employeeId,
          CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN CONCAT(first_name, ' ', last_name)
            WHEN first_name IS NOT NULL THEN first_name
            WHEN last_name IS NOT NULL THEN last_name
            ELSE name
          END AS full_name,
          joiningDate,
          office_id,
          DAY(joiningDate) AS day_of_month
        FROM employees 
        WHERE status = 1 
          AND joiningDate IS NOT NULL 
          AND MONTH(joiningDate) = ?
          AND DAY(joiningDate) > ?
          AND YEAR(joiningDate) < YEAR(CURDATE())
        ORDER BY day_of_month ASC
        LIMIT 5
      `, [currentMonth, currentDate]);

      // Format the data for frontend consumption
      const formatCelebrationsData = (data, type) => {
        return data.map(item => ({
          id: item.id,
          employeeId: item.employeeId,
          name: item.full_name?.trim() || 'Unknown Employee',
          date: formatDateDisplay(type === 'birthday' ? item.dob : item.joiningDate),
          dayOfMonth: item.day_of_month,
          yearsCompleted: type === 'anniversary' ? calculateYears(item.joiningDate) + 1 : calculateYears(item.dob),
          officeId: item.office_id,
          type: type
        }));
      };

      const response = {
        today: {
          birthdays: formatCelebrationsData(todayBirthdays, 'birthday'),
          anniversaries: formatCelebrationsData(todayAnniversaries, 'anniversary')
        },
        upcoming: {
          birthdays: formatCelebrationsData(upcomingBirthdays, 'birthday'),
          anniversaries: formatCelebrationsData(upcomingAnniversaries, 'anniversary')
        },
        currentMonth: {
          name: today.toLocaleString('default', { month: 'long' }),
          number: currentMonth,
          year: today.getFullYear()
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Dashboard celebrations error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch celebrations data',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};
