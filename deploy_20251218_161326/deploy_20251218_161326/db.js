// Proxy to backend DB pool to support scripts in repo root that use require('./db')
module.exports = require('./backend/db');
