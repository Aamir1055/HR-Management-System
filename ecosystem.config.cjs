module.exports = {
  apps: [{
    name: 'payroll-backend',
    script: './backend/server.js',
    env: {
      DB_USER: 'payroll_user',
      DB_PASSWORD: 'Hasnain_2009',
      DB_HOST: '127.0.0.1',
      DB_NAME: 'payroll_system',
      NODE_ENV: 'production'
    }
  }]
};

