// Automated Deployment Script for PayRoll Management System
// Handles production deployment setup, validation, and initialization

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { runMigration } = require('./migrate.js');
const { runHealthCheck } = require('./health-check.js');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Configuration validation
const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'PORT'
];

const OPTIONAL_ENV_VARS = [
  'FRONTEND_URL',
  'CORS_ORIGINS',
  'NODE_ENV',
  'HALF_DAY_FEATURE_ENABLED',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS'
];

// Deployment steps
class DeploymentManager {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async validateEnvironment() {
    log('\n🔧 Validating Environment Variables...', 'yellow');
    
    // Check required variables
    for (const envVar of REQUIRED_ENV_VARS) {
      if (!process.env[envVar]) {
        this.errors.push(`Missing required environment variable: ${envVar}`);
        log(`   ❌ ${envVar}: Missing (Required)`, 'red');
      } else {
        const displayValue = envVar.includes('PASSWORD') || envVar.includes('SECRET') 
          ? '[HIDDEN]' 
          : process.env[envVar];
        log(`   ✅ ${envVar}: ${displayValue}`, 'green');
      }
    }

    // Check optional variables
    for (const envVar of OPTIONAL_ENV_VARS) {
      if (!process.env[envVar]) {
        this.warnings.push(`Optional environment variable not set: ${envVar}`);
        log(`   ⚠️  ${envVar}: Not set (Optional)`, 'yellow');
      } else {
        log(`   ✅ ${envVar}: ${process.env[envVar]}`, 'green');
      }
    }

    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.warnings.push('JWT_SECRET should be at least 32 characters long for security');
      log('   ⚠️  JWT_SECRET: Too short (recommend 32+ characters)', 'yellow');
    }

    // Check NODE_ENV
    if (process.env.NODE_ENV === 'production') {
      log('   🎯 Production mode detected', 'green');
    } else {
      log('   🧪 Development mode detected', 'yellow');
    }

    return this.errors.length === 0;
  }

  async createDirectories() {
    log('\n📁 Creating Required Directories...', 'yellow');
    
    const directories = [
      'logs',
      'uploads',
      'uploads/temp',
      'backups'
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        log(`   ✅ Created directory: ${dir}`, 'green');
      } catch (error) {
        if (error.code !== 'EEXIST') {
          this.errors.push(`Failed to create directory ${dir}: ${error.message}`);
          log(`   ❌ Failed to create directory: ${dir}`, 'red');
        } else {
          log(`   ✅ Directory exists: ${dir}`, 'green');
        }
      }
    }
  }

  async validatePackageDependencies() {
    log('\n📦 Validating Dependencies...', 'yellow');
    
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      
      log(`   ✅ Found ${dependencies.length} dependencies`, 'green');
      
      // Check critical dependencies
      const critical = ['express', 'mysql2', 'cors', 'dotenv', 'jsonwebtoken', 'bcrypt'];
      const missing = critical.filter(dep => !dependencies.includes(dep));
      
      if (missing.length > 0) {
        this.errors.push(`Missing critical dependencies: ${missing.join(', ')}`);
        log(`   ❌ Missing critical dependencies: ${missing.join(', ')}`, 'red');
      } else {
        log('   ✅ All critical dependencies present', 'green');
      }
      
    } catch (error) {
      this.errors.push(`Failed to validate dependencies: ${error.message}`);
      log('   ❌ Failed to validate package.json', 'red');
    }
  }

  async runDatabaseMigration() {
    log('\n🗄️  Running Database Migration...', 'yellow');
    
    try {
      await runMigration();
      log('   ✅ Database migration completed successfully', 'green');
    } catch (error) {
      this.errors.push(`Database migration failed: ${error.message}`);
      log(`   ❌ Database migration failed: ${error.message}`, 'red');
    }
  }

  async setupLogRotation() {
    log('\n📝 Setting up Log Rotation...', 'yellow');
    
    try {
      const logrotateConfig = `
# PayRoll Management System log rotation
./logs/*.log {
  daily
  missingok
  rotate 30
  compress
  delaycompress
  notifempty
  create 0640 www-data www-data
  postrotate
    pm2 reloadLogs
  endscript
}
`;
      
      await fs.writeFile('logrotate.conf', logrotateConfig.trim());
      log('   ✅ Log rotation configuration created', 'green');
      log('   💡 Add to system crontab: 0 0 * * * logrotate -f ./logrotate.conf', 'cyan');
      
    } catch (error) {
      this.warnings.push(`Failed to create log rotation config: ${error.message}`);
      log(`   ⚠️  Failed to create log rotation config: ${error.message}`, 'yellow');
    }
  }

  async createSystemdService() {
    if (process.env.NODE_ENV !== 'production') {
      log('\n⚠️  Skipping systemd service creation (not in production mode)', 'yellow');
      return;
    }

    log('\n🔧 Creating Systemd Service File...', 'yellow');
    
    try {
      const serviceContent = `[Unit]
Description=PayRoll Management System Backend
After=network.target
StartLimitIntervalSec=0

[Service]
Type=forking
Restart=always
RestartSec=1
User=www-data
Group=www-data
WorkingDirectory=${process.cwd()}
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_PATH=/usr/local/lib/node_modules
ExecStart=/usr/local/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/local/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/local/bin/pm2 delete ecosystem.config.js

[Install]
WantedBy=multi-user.target
`;

      await fs.writeFile('payroll-backend.service', serviceContent.trim());
      log('   ✅ Systemd service file created: payroll-backend.service', 'green');
      log('   💡 Install with: sudo cp payroll-backend.service /etc/systemd/system/', 'cyan');
      log('   💡 Enable with: sudo systemctl enable payroll-backend', 'cyan');
      
    } catch (error) {
      this.warnings.push(`Failed to create systemd service: ${error.message}`);
      log(`   ⚠️  Failed to create systemd service: ${error.message}`, 'yellow');
    }
  }

  async generateSecurityReport() {
    log('\n🔒 Security Configuration Report...', 'yellow');
    
    const securityChecks = [
      {
        name: 'JWT Secret Strength',
        check: () => process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
        impact: 'High'
      },
      {
        name: 'Production Environment',
        check: () => process.env.NODE_ENV === 'production',
        impact: 'Medium'
      },
      {
        name: 'CORS Configuration',
        check: () => process.env.CORS_ORIGINS && !process.env.CORS_ORIGINS.includes('*'),
        impact: 'High'
      },
      {
        name: 'Database Password Set',
        check: () => process.env.DB_PASSWORD && process.env.DB_PASSWORD.length > 0,
        impact: 'Critical'
      },
      {
        name: 'Rate Limiting Enabled',
        check: () => process.env.RATE_LIMIT_MAX_REQUESTS && parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) > 0,
        impact: 'Medium'
      }
    ];

    securityChecks.forEach(({ name, check, impact }) => {
      const passed = check();
      const emoji = passed ? '✅' : '❌';
      const color = passed ? 'green' : 'red';
      log(`   ${emoji} ${name} (${impact} Impact)`, color);
    });
  }

  async runDeployment() {
    console.log('\n' + '='.repeat(80));
    log('🚀 PayRoll Management System - Automated Deployment', 'blue');
    console.log('='.repeat(80));

    const startTime = Date.now();

    // Step 1: Environment Validation
    const envValid = await this.validateEnvironment();
    if (!envValid) {
      log('\n❌ Environment validation failed. Deployment aborted.', 'red');
      return false;
    }

    // Step 2: Create Directories
    await this.createDirectories();

    // Step 3: Validate Dependencies
    await this.validatePackageDependencies();

    // Step 4: Database Migration
    await this.runDatabaseMigration();

    // Step 5: Log Rotation Setup
    await this.setupLogRotation();

    // Step 6: Systemd Service (production only)
    await this.createSystemdService();

    // Step 7: Security Report
    await this.generateSecurityReport();

    // Summary
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n' + '='.repeat(80));
    
    if (this.errors.length === 0) {
      log('🎉 Deployment completed successfully!', 'green');
    } else {
      log('❌ Deployment completed with errors!', 'red');
      this.errors.forEach(error => log(`   • ${error}`, 'red'));
    }

    if (this.warnings.length > 0) {
      log('\n⚠️  Warnings:', 'yellow');
      this.warnings.forEach(warning => log(`   • ${warning}`, 'yellow'));
    }

    log(`\n⏱️  Deployment completed in ${duration}ms`, 'blue');
    
    console.log('\n📋 Next Steps:');
    log('1. Start the application: npm run pm2:start', 'cyan');
    log('2. Check health: npm run health-check', 'cyan');
    log('3. View logs: npm run pm2:logs', 'cyan');
    log('4. Monitor: npm run pm2:monit', 'cyan');
    
    if (process.env.NODE_ENV === 'production') {
      log('\n🏭 Production Environment Detected:', 'blue');
      log('• Install systemd service: sudo cp payroll-backend.service /etc/systemd/system/', 'cyan');
      log('• Enable service: sudo systemctl enable payroll-backend', 'cyan');
      log('• Start service: sudo systemctl start payroll-backend', 'cyan');
    }

    console.log('='.repeat(80) + '\n');

    return this.errors.length === 0;
  }
}

// Main execution
async function main() {
  try {
    const deployment = new DeploymentManager();
    const success = await deployment.runDeployment();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`❌ Deployment failed with error: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

// Run deployment if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { DeploymentManager };
