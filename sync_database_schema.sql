-- Database Schema Synchronization Script
-- This script will sync the server database schema to match the local schema

USE payroll_system2;

-- First, let's see if we need to drop the extra DATE columns that aren't in local
-- The local schema uses VARCHAR(10) for dates, but server has both VARCHAR and DATE

-- 1. Drop the duplicate DATE columns if they exist (since local uses VARCHAR)
ALTER TABLE employees DROP COLUMN IF EXISTS joiningDate_date;
ALTER TABLE employees DROP COLUMN IF EXISTS dob_date;
ALTER TABLE employees DROP COLUMN IF EXISTS passport_expiry_date;
ALTER TABLE employees DROP COLUMN IF EXISTS visa_expiry_date;

-- 2. Ensure the VARCHAR date columns exist and have correct structure
-- Note: These should already exist based on the server schema, but let's make sure they match local exactly

-- 3. Make sure all columns match the local schema exactly
-- Check if joiningDate is NOT NULL (as per local schema)
ALTER TABLE employees MODIFY COLUMN joiningDate varchar(10) NOT NULL;

-- 4. Ensure all other columns match the local schema structure
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

-- 5. Recreate indexes to match local schema
-- Drop existing indexes first, then recreate
DROP INDEX IF EXISTS employeeId ON employees;
DROP INDEX IF EXISTS email ON employees;

-- Add the primary key and unique constraints
ALTER TABLE employees ADD CONSTRAINT PRIMARY KEY (id);
ALTER TABLE employees ADD UNIQUE KEY employeeId (employeeId);
ALTER TABLE employees ADD UNIQUE KEY email (email);

-- 6. Add any missing indexes that might be needed
-- (Add other indexes as needed based on foreign keys)

-- 7. Show the final structure to verify
SELECT 'Schema synchronization completed. Here is the final structure:' as Status;
DESCRIBE employees;
