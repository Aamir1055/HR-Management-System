-- Remove unique constraint from positions.title to allow same position titles for different offices
-- This enables creating the same position (e.g., "Manager") for multiple offices

USE payroll_system;

-- First, let's see the current constraint
SHOW INDEX FROM positions WHERE Column_name = 'title';

-- Drop the unique constraint on title column
-- Note: The actual constraint name might vary, common names are 'title', 'title_UNIQUE', etc.
-- We'll try the most common variations

-- Try dropping if constraint is named 'title'
SET @sql = 'ALTER TABLE positions DROP INDEX title';
SET @constraintExists = (SELECT COUNT(*) FROM information_schema.statistics 
                        WHERE table_schema = DATABASE() 
                        AND table_name = 'positions' 
                        AND index_name = 'title');

SET @sql = IF(@constraintExists > 0, @sql, 'SELECT "No constraint named title found" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Try dropping if constraint is named 'title_UNIQUE'
SET @sql = 'ALTER TABLE positions DROP INDEX title_UNIQUE';
SET @constraintExists = (SELECT COUNT(*) FROM information_schema.statistics 
                        WHERE table_schema = DATABASE() 
                        AND table_name = 'positions' 
                        AND index_name = 'title_UNIQUE');

SET @sql = IF(@constraintExists > 0, @sql, 'SELECT "No constraint named title_UNIQUE found" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Try dropping if there's any UNIQUE constraint on title column
SET @sql = (SELECT CONCAT('ALTER TABLE positions DROP INDEX ', index_name)
           FROM information_schema.statistics 
           WHERE table_schema = DATABASE() 
           AND table_name = 'positions' 
           AND column_name = 'title' 
           AND non_unique = 0
           LIMIT 1);

SET @sql = IFNULL(@sql, 'SELECT "No unique constraint found on title column" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the constraint is removed
SELECT 
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
AND table_name = 'positions' 
AND column_name = 'title';

SELECT 'Migration completed: positions.title unique constraint removed' as result;
