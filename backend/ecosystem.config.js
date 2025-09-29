// PM2 Ecosystem Configuration for PayRoll Management System Backend
// Production-ready process management with clustering, logging, and monitoring

module.exports = {
  apps: [
    {
      name: 'payroll-backend',
      script: './server.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      wait_ready: true,
      
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Source map support
      source_map_support: false,
      
      // Node.js options
      node_args: [
        '--max_old_space_size=1024',
        '--optimize-for-size'
      ],
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Time zone
      time: true,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Log rotation
      log_type: 'json',
      
      // Error handling
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],
      
      // Custom configuration for database connections
      env_file: '.env',
      
      // Graceful shutdown
      kill_retry_time: 2000
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'your-repo-url',
      path: '/var/www/payroll-management',
      'post-deploy': 'npm install --production && npm run migrate:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'git clone your-repo-url .',
      'post-setup': 'npm install --production && npm run migrate:prod'
    },
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/staging',
      repo: 'your-repo-url',
      path: '/var/www/payroll-staging',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
