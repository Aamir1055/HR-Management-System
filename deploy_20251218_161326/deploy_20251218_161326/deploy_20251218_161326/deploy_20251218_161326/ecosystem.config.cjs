module.exports = {
  apps: [{
    name: 'payroll-backend',
    script: './backend/server.js',
    env: {
      DB_USER: 'payrolluser',
      DB_PASSWORD: '',
      DB_HOST: 'localhost',
      DB_NAME: 'payroll_system2',
      NODE_ENV: 'production'
    }
  }]
};

