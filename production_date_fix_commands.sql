-- PRODUCTION DATE FORMAT CONVERSION
-- Run these commands on your production database to convert from YYYY-MM-DD to DD/MM/YYYY
-- 
-- IMPORTANT: BACKUP YOUR DATABASE FIRST!
-- 
-- Expected result for Employee 295:
-- joiningDate: 2025-07-01 → 01/07/2025
-- dob: 2001-06-22 → 22/06/2001  
-- passport_expiry: 2034-06-10 → 10/06/2034
-- visa_expiry: 2025-08-24 → 24/08/2025

-- Step 1: Check current format (verify before changes)
SELECT 
    employeeId,
    joiningDate,
    dob, 
    passport_expiry,
    visa_expiry
FROM employees 
WHERE employeeId = '295'
LIMIT 1;

-- Step 2: Convert joiningDate from YYYY-MM-DD to DD/MM/YYYY
UPDATE employees 
SET joiningDate = CONCAT(
    LPAD(DAY(STR_TO_DATE(joiningDate, '%Y-%m-%d')), 2, '0'), '/',
    LPAD(MONTH(STR_TO_DATE(joiningDate, '%Y-%m-%d')), 2, '0'), '/',
    YEAR(STR_TO_DATE(joiningDate, '%Y-%m-%d'))
)
WHERE joiningDate IS NOT NULL 
AND joiningDate != '' 
AND joiningDate REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Step 3: Convert dob from YYYY-MM-DD to DD/MM/YYYY
UPDATE employees 
SET dob = CONCAT(
    LPAD(DAY(STR_TO_DATE(dob, '%Y-%m-%d')), 2, '0'), '/',
    LPAD(MONTH(STR_TO_DATE(dob, '%Y-%m-%d')), 2, '0'), '/',
    YEAR(STR_TO_DATE(dob, '%Y-%m-%d'))
)
WHERE dob IS NOT NULL 
AND dob != '' 
AND dob REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Step 4: Convert passport_expiry from YYYY-MM-DD to DD/MM/YYYY
UPDATE employees 
SET passport_expiry = CONCAT(
    LPAD(DAY(STR_TO_DATE(passport_expiry, '%Y-%m-%d')), 2, '0'), '/',
    LPAD(MONTH(STR_TO_DATE(passport_expiry, '%Y-%m-%d')), 2, '0'), '/',
    YEAR(STR_TO_DATE(passport_expiry, '%Y-%m-%d'))
)
WHERE passport_expiry IS NOT NULL 
AND passport_expiry != '' 
AND passport_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Step 5: Convert visa_expiry from YYYY-MM-DD to DD/MM/YYYY
UPDATE employees 
SET visa_expiry = CONCAT(
    LPAD(DAY(STR_TO_DATE(visa_expiry, '%Y-%m-%d')), 2, '0'), '/',
    LPAD(MONTH(STR_TO_DATE(visa_expiry, '%Y-%m-%d')), 2, '0'), '/',
    YEAR(STR_TO_DATE(visa_expiry, '%Y-%m-%d'))
)
WHERE visa_expiry IS NOT NULL 
AND visa_expiry != '' 
AND visa_expiry REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Step 6: Verify the conversion worked
SELECT 
    employeeId,
    joiningDate,
    dob,
    passport_expiry,
    visa_expiry
FROM employees 
WHERE employeeId = '295'
LIMIT 1;

-- Expected output after conversion:
-- joiningDate: 01/07/2025
-- dob: 22/06/2001
-- passport_expiry: 10/06/2034  
-- visa_expiry: 24/08/2025

-- Step 7: Count total conversions
SELECT 
    COUNT(*) as total_employees,
    COUNT(CASE WHEN joiningDate LIKE '__/__/____' THEN 1 END) as joiningDate_converted,
    COUNT(CASE WHEN dob LIKE '__/__/____' THEN 1 END) as dob_converted,
    COUNT(CASE WHEN passport_expiry LIKE '__/__/____' THEN 1 END) as passport_expiry_converted,
    COUNT(CASE WHEN visa_expiry LIKE '__/__/____' THEN 1 END) as visa_expiry_converted
FROM employees;
