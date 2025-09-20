-- SQL Script to convert date formats from YYYY-MM-DD to DD/MM/YYYY
-- Generated on: 2025-09-12
-- Purpose: Match local environment date format (DD/MM/YYYY)

-- IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT!

-- Step 1: Convert joiningDate from YYYY-MM-DD to DD/MM/YYYY
UPDATE employees 
SET joiningDate = CONCAT(
    DAY(STR_TO_DATE(joiningDate, '%Y-%m-%d')), '/',
    MONTH(STR_TO_DATE(joiningDate, '%Y-%m-%d')), '/',
    YEAR(STR_TO_DATE(joiningDate, '%Y-%m-%d'))
)
WHERE joiningDate IS NOT NULL 
AND joiningDate != '' 
AND joiningDate REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Step 2: Convert dob from YYYY-MM-DD to DD/MM/YYYY  
UPDATE employees 
SET dob = CONCAT(
    DAY(STR_TO_DATE(dob, '%Y-%m-%d')), '/',
    MONTH(STR_TO_DATE(dob, '%Y-%m-%d')), '/',
    YEAR(STR_TO_DATE(dob, '%Y-%m-%d'))
)
WHERE dob IS NOT NULL 
AND dob != '' 
AND dob REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Step 3: Convert passport_expiry from YYYY-MM-DD to DD/MM/YYYY
UPDATE employees 
SET passport_expiry = CONCAT(
    DAY(STR_TO_DATE(passport_expiry, '%Y-%m-%d')), '/',
    MONTH(STR_TO_DATE(passport_expiry, '%Y-%m-%d')), '/',
    YEAR(STR_TO_DATE(passport_expiry, '%Y-%m-%d'))
)
WHERE passport_expiry IS NOT NULL 
AND passport_expiry != '' 
AND passport_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Step 4: Convert visa_expiry from YYYY-MM-DD to DD/MM/YYYY
UPDATE employees 
SET visa_expiry = CONCAT(
    DAY(STR_TO_DATE(visa_expiry, '%Y-%m-%d')), '/',
    MONTH(STR_TO_DATE(visa_expiry, '%Y-%m-%d')), '/',
    YEAR(STR_TO_DATE(visa_expiry, '%Y-%m-%d'))
)
WHERE visa_expiry IS NOT NULL 
AND visa_expiry != '' 
AND visa_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Verification queries to check the conversion
-- Run these after the UPDATE statements to verify the results

SELECT 
    employeeId,
    joiningDate,
    dob,
    passport_expiry,
    visa_expiry
FROM employees 
WHERE employeeId = '295'
LIMIT 1;

-- Count how many records were converted
SELECT 
    COUNT(*) as total_employees,
    COUNT(CASE WHEN joiningDate LIKE '%/%' THEN 1 END) as joiningDate_converted,
    COUNT(CASE WHEN dob LIKE '%/%' THEN 1 END) as dob_converted,
    COUNT(CASE WHEN passport_expiry LIKE '%/%' THEN 1 END) as passport_expiry_converted,
    COUNT(CASE WHEN visa_expiry LIKE '%/%' THEN 1 END) as visa_expiry_converted
FROM employees;
