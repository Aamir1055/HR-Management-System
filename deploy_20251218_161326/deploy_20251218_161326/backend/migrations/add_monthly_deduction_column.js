// Database migration to add monthly_deduction column to employee_loans table
// Enables optional fixed monthly deduction amounts for loan repayment tracking
const db = require('../db');

/**
 * Migration: Add monthly_deduction column to employee_loans table
 * This column will store the monthly deduction amount for loans
 */
async function addMonthlyDeductionColumn() {
  console.log('Starting migration: Add monthly_deduction column to employee_loans...');
  
  try {
    // Check if column already exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'employee_loans' 
      AND COLUMN_NAME = 'monthly_deduction'
    `);
    
    if (columns.length > 0) {
      console.log('✓ monthly_deduction column already exists in employee_loans table');
      return;
    }
    
    // Add the monthly_deduction column
    await db.query(`
      ALTER TABLE employee_loans 
      ADD COLUMN monthly_deduction DECIMAL(10,2) DEFAULT NULL 
      COMMENT 'Optional monthly deduction amount for loan repayment'
      AFTER remaining_amount
    `);
    
    console.log('✓ Successfully added monthly_deduction column to employee_loans table');
    
  } catch (error) {
    console.error('❌ Error adding monthly_deduction column:', error);
    throw error;
  }
}

/**
 * Rollback: Remove monthly_deduction column from employee_loans table
 */
async function removeMonthlyDeductionColumn() {
  console.log('Rolling back: Remove monthly_deduction column from employee_loans...');
  
  try {
    // Check if column exists before trying to remove it
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'employee_loans' 
      AND COLUMN_NAME = 'monthly_deduction'
    `);
    
    if (columns.length === 0) {
      console.log('✓ monthly_deduction column does not exist in employee_loans table');
      return;
    }
    
    // Remove the monthly_deduction column
    await db.query(`
      ALTER TABLE employee_loans 
      DROP COLUMN monthly_deduction
    `);
    
    console.log('✓ Successfully removed monthly_deduction column from employee_loans table');
    
  } catch (error) {
    console.error('❌ Error removing monthly_deduction column:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addMonthlyDeductionColumn()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  up: addMonthlyDeductionColumn,
  down: removeMonthlyDeductionColumn
};
