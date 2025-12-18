// Database utility wrapper providing promise-based query execution interface
// Simplifies database operations by wrapping mysql2/promise pool with consistent error handling
const pool = require('../db/index');

// Since we're using mysql2/promise, the pool already returns promises
module.exports = {
  query: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
};
