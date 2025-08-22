-- Remove UNIQUE constraint from positions.title column
-- This allows creating positions with the same title for different offices

-- Check current indexes on positions table
SHOW INDEX FROM positions;

-- Remove the UNIQUE constraint on title (trying common constraint names)
ALTER TABLE positions DROP INDEX title;

-- If the above fails, try this alternative:
-- ALTER TABLE positions DROP INDEX title_UNIQUE;

-- Verify the constraint is removed
SHOW INDEX FROM positions WHERE Column_name = 'title';
