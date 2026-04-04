/**
 * Migration: Alter Peticash Table - New field structure
 * Removes company, payment_type, disbursed_amount
 * Adds narration, authorised_amount
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function alterPeticashTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_system'
  });

  try {
    console.log('🔄 Altering peticash table...');

    // Add narration column
    await connection.execute(`
      ALTER TABLE peticash ADD COLUMN IF NOT EXISTS narration TEXT AFTER expense_category
    `).catch(() => {
      console.log('narration column may already exist, continuing...');
    });

    // Add authorised_amount column (copy from disbursed_amount if exists)
    await connection.execute(`
      ALTER TABLE peticash ADD COLUMN IF NOT EXISTS authorised_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER narration
    `).catch(() => {
      console.log('authorised_amount column may already exist, continuing...');
    });

    // Copy disbursed_amount data to authorised_amount
    await connection.execute(`
      UPDATE peticash SET authorised_amount = disbursed_amount WHERE authorised_amount = 0 AND disbursed_amount > 0
    `).catch(() => {});

    // Drop old columns (ignore errors if already dropped)
    for (const col of ['company', 'payment_type', 'disbursed_amount']) {
      await connection.execute(`ALTER TABLE peticash DROP COLUMN ${col}`).catch(() => {
        console.log(`Column ${col} may already be dropped, continuing...`);
      });
    }

    // Drop old indexes
    for (const idx of ['idx_company', 'idx_payment_type']) {
      await connection.execute(`ALTER TABLE peticash DROP INDEX ${idx}`).catch(() => {});
    }

    console.log('✅ Peticash table altered successfully');

    // Show new structure
    const [columns] = await connection.execute('DESCRIBE peticash');
    console.log('\nNew table structure:');
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

alterPeticashTable();
