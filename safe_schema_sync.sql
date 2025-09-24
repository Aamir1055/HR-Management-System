-- Safe Database Schema Synchronization Script
-- This script will sync the server database schema to match the local schema

USE payroll_system2;

-- Check current structure first
SELECT 'Current employees table structure before sync:' as Status;
DESCRIBE employees;

-- Drop the extra DATE columns that exist on server but not on local
-- We'll use a safer approach without IF EXISTS

-- First, let's try to drop the extra columns (ignore errors if they don't exist)
SET @sql = (SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE employees DROP COLUMN joiningDate_date;',
    'SELECT "joiningDate_date column does not exist" as Info;'
) FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'payroll_system2' 
AND TABLE_NAME = 'employees' 
AND COLUMN_NAME = 'joiningDate_date');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE employees DROP COLUMN dob_date;',
    'SELECT "dob_date column does not exist" as Info;'
) FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'payroll_system2' 
AND TABLE_NAME = 'employees' 
AND COLUMN_NAME = 'dob_date');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE employees DROP COLUMN passport_expiry_date;',
    'SELECT "passport_expiry_date column does not exist" as Info;'
) FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'payroll_system2' 
AND TABLE_NAME = 'employees' 
AND COLUMN_NAME = 'passport_expiry_date');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE employees DROP COLUMN visa_expiry_date;',
    'SELECT "visa_expiry_date column does not exist" as Info;'
) FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'payroll_system2' 
AND TABLE_NAME = 'employees' 
AND COLUMN_NAME = 'visa_expiry_date');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Now ensure all columns match the local schema exactly
-- Make sure joiningDate is NOT NULL as per local schema
ALTER TABLE employees MODIFY COLUMN joiningDate varchar(10) NOT NULL;

-- Ensure all other columns match the local schema structure
ALTER TABLE employees MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE employees MODIFY COLUMN employeeId int(11) NOT NULL;
ALTER TABLE employees MODIFY COLUMN nationality varchar(50) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN name varchar(100) NOT NULL;
ALTER TABLE employees MODIFY COLUMN first_name varchar(50) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN last_name varchar(50) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN email varchar(100) NOT NULL;
ALTER TABLE employees MODIFY COLUMN office_id int(11) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN position_id int(11) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN monthlySalary decimal(10,2) NOT NULL;
ALTER TABLE employees MODIFY COLUMN dob varchar(10) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN passport_number varchar(20) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN passport_expiry varchar(10) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN visa_type varchar(50) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN platform varchar(50) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN address varchar(255) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN current_address varchar(255) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN phone varchar(20) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN gender enum('Male','Female','Other') DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN status tinyint(1) DEFAULT 1;
ALTER TABLE employees MODIFY COLUMN created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE employees MODIFY COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE employees MODIFY COLUMN half_day_eligible tinyint(1) DEFAULT 1;
ALTER TABLE employees MODIFY COLUMN whatsapp varchar(20) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN visa_expiry varchar(10) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN primary_language varchar(50) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN secondary_language varchar(50) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN marital_status enum('Single','Married','Divorced','Widowed','Other') DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN hiring_source varchar(100) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN salary_currency varchar(10) DEFAULT 'AED';
ALTER TABLE employees MODIFY COLUMN emirates_id varchar(20) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN emergency_contact varchar(20) DEFAULT NULL;
ALTER TABLE employees MODIFY COLUMN emergency_contact_relation varchar(50) DEFAULT NULL;

-- Show the final structure to verify
SELECT 'Schema synchronization completed. Here is the final structure:' as Status;
DESCRIBE employees;
