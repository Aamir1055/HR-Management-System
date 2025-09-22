-- =====================================================
-- EMPLOYEES TABLE DATE MIGRATION SCRIPT
-- Converting VARCHAR date columns to proper DATE type
-- =====================================================

-- Step 1: Create backup of current employees table
CREATE TABLE `employees_backup_before_date_migration` AS 
SELECT * FROM `employees`;

-- Verify backup
SELECT COUNT(*) as 'Original Records Count' FROM `employees`;
SELECT COUNT(*) as 'Backup Records Count' FROM `employees_backup_before_date_migration`;

-- =====================================================
-- Step 2: Add temporary DATE columns
-- =====================================================

-- Add temporary columns with _temp suffix
ALTER TABLE `employees` 
ADD COLUMN `joiningDate_temp` DATE DEFAULT NULL,
ADD COLUMN `dob_temp` DATE DEFAULT NULL,
ADD COLUMN `passport_expiry_temp` DATE DEFAULT NULL,
ADD COLUMN `visa_expiry_temp` DATE DEFAULT NULL;

-- =====================================================
-- Step 3: Convert existing VARCHAR dates to DATE format
-- =====================================================

-- Function to convert dd/mm/yyyy or dd-mm-yyyy to DATE
-- Handle joiningDate conversion
UPDATE `employees` SET `joiningDate_temp` = CASE
    WHEN `joiningDate` IS NULL OR `joiningDate` = '' THEN NULL
    WHEN `joiningDate` REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN 
        STR_TO_DATE(`joiningDate`, '%d/%m/%Y')
    WHEN `joiningDate` REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN 
        STR_TO_DATE(`joiningDate`, '%d-%m-%Y')
    WHEN `joiningDate` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 
        STR_TO_DATE(`joiningDate`, '%Y-%m-%d')
    ELSE NULL
END;

-- Handle dob conversion
UPDATE `employees` SET `dob_temp` = CASE
    WHEN `dob` IS NULL OR `dob` = '' THEN NULL
    WHEN `dob` REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN 
        STR_TO_DATE(`dob`, '%d/%m/%Y')
    WHEN `dob` REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN 
        STR_TO_DATE(`dob`, '%d-%m-%Y')
    WHEN `dob` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 
        STR_TO_DATE(`dob`, '%Y-%m-%d')
    ELSE NULL
END;

-- Handle passport_expiry conversion
UPDATE `employees` SET `passport_expiry_temp` = CASE
    WHEN `passport_expiry` IS NULL OR `passport_expiry` = '' THEN NULL
    WHEN `passport_expiry` REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN 
        STR_TO_DATE(`passport_expiry`, '%d/%m/%Y')
    WHEN `passport_expiry` REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN 
        STR_TO_DATE(`passport_expiry`, '%d-%m-%Y')
    WHEN `passport_expiry` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 
        STR_TO_DATE(`passport_expiry`, '%Y-%m-%d')
    ELSE NULL
END;

-- Handle visa_expiry conversion
UPDATE `employees` SET `visa_expiry_temp` = CASE
    WHEN `visa_expiry` IS NULL OR `visa_expiry` = '' THEN NULL
    WHEN `visa_expiry` REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN 
        STR_TO_DATE(`visa_expiry`, '%d/%m/%Y')
    WHEN `visa_expiry` REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN 
        STR_TO_DATE(`visa_expiry`, '%d-%m-%Y')
    WHEN `visa_expiry` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 
        STR_TO_DATE(`visa_expiry`, '%Y-%m-%d')
    ELSE NULL
END;

-- =====================================================
-- Step 4: Verify conversion results
-- =====================================================

-- Check conversion results
SELECT 
    'joiningDate' as column_name,
    COUNT(*) as total_records,
    COUNT(`joiningDate`) as original_non_null,
    COUNT(`joiningDate_temp`) as converted_non_null,
    COUNT(CASE WHEN `joiningDate` IS NOT NULL AND `joiningDate` != '' AND `joiningDate_temp` IS NULL THEN 1 END) as failed_conversions
FROM `employees`

UNION ALL

SELECT 
    'dob' as column_name,
    COUNT(*) as total_records,
    COUNT(`dob`) as original_non_null,
    COUNT(`dob_temp`) as converted_non_null,
    COUNT(CASE WHEN `dob` IS NOT NULL AND `dob` != '' AND `dob_temp` IS NULL THEN 1 END) as failed_conversions
FROM `employees`

UNION ALL

SELECT 
    'passport_expiry' as column_name,
    COUNT(*) as total_records,
    COUNT(`passport_expiry`) as original_non_null,
    COUNT(`passport_expiry_temp`) as converted_non_null,
    COUNT(CASE WHEN `passport_expiry` IS NOT NULL AND `passport_expiry` != '' AND `passport_expiry_temp` IS NULL THEN 1 END) as failed_conversions
FROM `employees`

UNION ALL

SELECT 
    'visa_expiry' as column_name,
    COUNT(*) as total_records,
    COUNT(`visa_expiry`) as original_non_null,
    COUNT(`visa_expiry_temp`) as converted_non_null,
    COUNT(CASE WHEN `visa_expiry` IS NOT NULL AND `visa_expiry` != '' AND `visa_expiry_temp` IS NULL THEN 1 END) as failed_conversions
FROM `employees`;

-- Show sample of converted data
SELECT 
    id,
    employeeId,
    name,
    joiningDate as old_joining,
    joiningDate_temp as new_joining,
    dob as old_dob,
    dob_temp as new_dob,
    passport_expiry as old_passport_exp,
    passport_expiry_temp as new_passport_exp,
    visa_expiry as old_visa_exp,
    visa_expiry_temp as new_visa_exp
FROM `employees` 
LIMIT 10;

-- =====================================================
-- Step 5: Replace old columns with new ones
-- (ONLY RUN AFTER VERIFYING Step 4 results are correct!)
-- =====================================================

-- Remove old VARCHAR columns
ALTER TABLE `employees` 
DROP COLUMN `joiningDate`,
DROP COLUMN `dob`,
DROP COLUMN `passport_expiry`,
DROP COLUMN `visa_expiry`;

-- Rename temporary columns to original names
ALTER TABLE `employees` 
CHANGE COLUMN `joiningDate_temp` `joiningDate` DATE NOT NULL,
CHANGE COLUMN `dob_temp` `dob` DATE DEFAULT NULL,
CHANGE COLUMN `passport_expiry_temp` `passport_expiry` DATE DEFAULT NULL,
CHANGE COLUMN `visa_expiry_temp` `visa_expiry` DATE DEFAULT NULL;

-- =====================================================
-- Step 6: Final verification
-- =====================================================

-- Show final table structure
DESCRIBE `employees`;

-- Show sample data with proper DATE format
SELECT 
    id,
    employeeId,
    name,
    joiningDate,
    dob,
    passport_expiry,
    visa_expiry,
    DATE_FORMAT(joiningDate, '%d/%m/%Y') as joining_display,
    DATE_FORMAT(dob, '%d/%m/%Y') as dob_display,
    DATE_FORMAT(passport_expiry, '%d/%m/%Y') as passport_exp_display,
    DATE_FORMAT(visa_expiry, '%d/%m/%Y') as visa_exp_display
FROM `employees` 
LIMIT 10;

-- Count final records
SELECT COUNT(*) as 'Final Records Count' FROM `employees`;

-- =====================================================
-- UPDATED TABLE SCHEMA AFTER MIGRATION
-- =====================================================

/*
CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `employeeId` varchar(10) NOT NULL,
  `nationality` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `office_id` int(11) DEFAULT NULL,
  `position_id` int(11) DEFAULT NULL,
  `monthlySalary` decimal(10,2) NOT NULL,
  `joiningDate` DATE NOT NULL,                    -- CHANGED from varchar(10)
  `dob` DATE DEFAULT NULL,                        -- CHANGED from varchar(10)
  `passport_number` varchar(20) DEFAULT NULL,
  `passport_expiry` DATE DEFAULT NULL,            -- CHANGED from varchar(10)
  `visa_type` varchar(50) DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `current_address` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `half_day_eligible` tinyint(1) DEFAULT 1,
  `whatsapp` varchar(20) DEFAULT NULL,
  `visa_expiry` DATE DEFAULT NULL,                -- CHANGED from varchar(10)
  `primary_language` varchar(50) DEFAULT NULL,
  `secondary_language` varchar(50) DEFAULT NULL,
  `marital_status` enum('Single','Married','Divorced','Widowed','Other') DEFAULT NULL,
  `hiring_source` varchar(100) DEFAULT NULL,
  `salary_currency` varchar(10) DEFAULT 'AED',
  `emirates_id` varchar(20) DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `emergency_contact_relation` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
*/

-- =====================================================
-- NOTES:
-- 1. Backup table 'employees_backup_before_date_migration' is created for safety
-- 2. Run Step 4 verification queries before proceeding to Step 5
-- 3. DATE columns store dates in MySQL's internal format (YYYY-MM-DD)
-- 4. Use DATE_FORMAT(column, '%d/%m/%Y') in PHP/queries to display as dd/mm/yyyy
-- 5. To drop backup after successful migration: DROP TABLE employees_backup_before_date_migration;
-- =====================================================
