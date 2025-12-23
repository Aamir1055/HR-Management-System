-- Set password and privileges for payroll_user
ALTER USER 'payroll_user'@'localhost' IDENTIFIED BY 'Hasnain_2009';
GRANT ALL PRIVILEGES ON payroll_system.* TO 'payroll_user'@'localhost';
FLUSH PRIVILEGES;
