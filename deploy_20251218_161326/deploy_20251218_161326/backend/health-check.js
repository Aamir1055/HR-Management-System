// Health Check Script for PayRoll Management System
// Validates server status, database connectivity, and essential services

require('dotenv').config();
const http = require('http');
const mysql = require('mysql2/promise');

const CONFIG = {
  port: process.env.PORT || 5000,
  host: 'localhost',
  dbConfig: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system2',
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Test server HTTP endpoint
function checkServerHealth() {
  return new Promise((resolve) => {
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          if (res.statusCode === 200 && health.status === 'OK') {
            resolve({
              success: true,
              status: res.statusCode,
              data: health
            });
          } else {
            resolve({
              success: false,
              status: res.statusCode,
              error: 'Invalid health response'
            });
          }
        } catch (error) {
          resolve({
            success: false,
            status: res.statusCode,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

// Test database connectivity
async function checkDatabaseHealth() {
  let connection;
  try {
    connection = await mysql.createConnection(CONFIG.dbConfig);
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test');
    
    // Check essential tables
    const tables = [
      'users', 'employees', 'offices', 'positions', 
      'attendance', 'payroll', 'holidays'
    ];
    
    const tableChecks = [];
    for (const table of tables) {
      try {
        await connection.execute(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
        tableChecks.push({ table, status: 'OK' });
      } catch (error) {
        tableChecks.push({ table, status: 'ERROR', error: error.message });
      }
    }
    
    return {
      success: true,
      connection: 'OK',
      tables: tableChecks
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main health check function
async function runHealthCheck() {
  console.log('\n' + '='.repeat(60));
  log('🏥 PayRoll Management System - Health Check', 'blue');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  let allHealthy = true;

  // 1. Server Health Check
  log('\n📡 Checking Server Health...', 'yellow');
  const serverHealth = await checkServerHealth();
  
  if (serverHealth.success) {
    log(`✅ Server is running on port ${CONFIG.port}`, 'green');
    log(`   Status: ${serverHealth.data?.status}`, 'green');
    log(`   Version: ${serverHealth.data?.version || 'Unknown'}`, 'green');
    
    if (serverHealth.data?.features) {
      log('   Features:', 'green');
      Object.entries(serverHealth.data.features).forEach(([feature, enabled]) => {
        log(`     • ${feature}: ${enabled ? 'Enabled' : 'Disabled'}`, enabled ? 'green' : 'yellow');
      });
    }
  } else {
    log(`❌ Server health check failed: ${serverHealth.error}`, 'red');
    allHealthy = false;
  }

  // 2. Database Health Check
  log('\n🗄️  Checking Database Health...', 'yellow');
  const dbHealth = await checkDatabaseHealth();
  
  if (dbHealth.success) {
    log('✅ Database connection successful', 'green');
    log('   Table Status:', 'green');
    
    dbHealth.tables.forEach(({ table, status, error }) => {
      if (status === 'OK') {
        log(`     • ${table}: OK`, 'green');
      } else {
        log(`     • ${table}: ERROR - ${error}`, 'red');
        allHealthy = false;
      }
    });
  } else {
    log(`❌ Database connection failed: ${dbHealth.error}`, 'red');
    allHealthy = false;
  }

  // 3. Environment Check
  log('\n🔧 Checking Environment Configuration...', 'yellow');
  const envChecks = [
    { name: 'NODE_ENV', value: process.env.NODE_ENV, required: false },
    { name: 'PORT', value: process.env.PORT, required: true },
    { name: 'DB_HOST', value: process.env.DB_HOST, required: true },
    { name: 'DB_NAME', value: process.env.DB_NAME, required: true },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET ? '[HIDDEN]' : undefined, required: true },
    { name: 'FRONTEND_URL', value: process.env.FRONTEND_URL, required: false },
    { name: 'HALF_DAY_FEATURE_ENABLED', value: process.env.HALF_DAY_FEATURE_ENABLED, required: false }
  ];
  
  envChecks.forEach(({ name, value, required }) => {
    if (value) {
      log(`   ✅ ${name}: ${value}`, 'green');
    } else if (required) {
      log(`   ❌ ${name}: Missing (Required)`, 'red');
      allHealthy = false;
    } else {
      log(`   ⚠️  ${name}: Not set (Optional)`, 'yellow');
    }
  });

  // 4. Summary
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n' + '='.repeat(60));
  if (allHealthy) {
    log('🎉 All health checks passed!', 'green');
  } else {
    log('⚠️  Some health checks failed!', 'red');
  }
  log(`⏱️  Health check completed in ${duration}ms`, 'blue');
  console.log('='.repeat(60) + '\n');
  
  // Exit with appropriate code
  process.exit(allHealthy ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

// Run health check if this file is executed directly
if (require.main === module) {
  runHealthCheck();
}

module.exports = {
  runHealthCheck,
  checkServerHealth,
  checkDatabaseHealth
};
