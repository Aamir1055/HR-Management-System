/**
 * Analyze an employee import Excel file and report why rows are skipped
 * Usage: node analyze_import_file.js "C:/Users/<user>/Downloads/employees_2025-09-29.xlsx"
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const {
  readExcelFile,
  validateExcelStructure,
  processExcelRow,
  processDateFields
} = require('./utils/excelUtils');
const { RequiredFields } = require('./models/Employee');
const EmployeeRepository = require('./repositories/EmployeeRepository');
const EmployeeValidationService = require('./services/EmployeeValidationService');
const EmployeeImportService = require('./services/EmployeeImportService');
const EmployeeService = require('./services/EmployeeService');

async function getDbConnection() {
  // Try to reuse app's DB connection settings if present
  // Fallback to mock DB if connection fails
  // You can adjust the env vars to point to your local dev DB
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_db',
  };
  try {
    const conn = await mysql.createConnection(config);
    await conn.query('SELECT 1');
    console.log('✅ Connected to DB for name lookups');
    return conn;
  } catch (e) {
    console.warn('⚠️ Could not connect to DB. Using mock lookups. Reason:', e.message);
    return {
      query: async (sql, params) => {
        // Minimal mock responses so we can still analyze validations
        if (/SELECT id FROM offices/i.test(sql)) return [[{ id: 1 }]];
        if (/SELECT id FROM positions/i.test(sql)) return [[{ id: 1 }]];
        return [[]];
      },
      end: async () => {}
    };
  }
}

function tally(arr) {
  const m = new Map();
  for (const item of arr) {
    m.set(item, (m.get(item) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Please provide the path to the Excel file.');
    process.exit(1);
  }
  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  console.log('🔎 Analyzing file:', filePath);

  const excelData = readExcelFile(filePath);
  if (!excelData.success) {
    console.error('❌ Failed to read Excel file:', excelData.error);
    process.exit(1);
  }

  console.log(`📄 Rows: ${excelData.rowCount}`);
  console.log(`🧾 Columns: ${excelData.availableColumns.join(', ')}`);

  const structure = validateExcelStructure(excelData, RequiredFields.import);
  if (!structure.isValid) {
    console.log('❌ Structure invalid:');
    structure.errors.forEach(e => console.log(' -', e));
    process.exit(0);
  }

  const db = await getDbConnection();
  const employeeRepository = new EmployeeRepository(db);
  const validationService = new EmployeeValidationService(employeeRepository);
  const employeeService = new EmployeeService(employeeRepository, validationService);
  const importService = new EmployeeImportService(employeeRepository, validationService, employeeService);

  let validCount = 0;
  let invalidCount = 0;
  const errorReasons = [];
  const sampleErrors = [];

  for (let i = 0; i < excelData.data.length; i++) {
    const raw = excelData.data[i];
    try {
      const processedRow = processExcelRow(raw, structure.columnMapping);
      const withDates = processDateFields(processedRow);
      const employeeData = await importService.convertExcelRowToEmployee(withDates, { db });

      const validation = validationService.validateForImport(employeeData, i);
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
        // collect reasons
        for (const e of validation.errors) {
          // group by the message without row prefix
          const reason = String(e).replace(/^Row \d+:\s*/, '');
          errorReasons.push(reason);
        }
        if (sampleErrors.length < 25) {
          sampleErrors.push({ row: i + 1, errors: validation.errors, warnings: validation.warnings });
        }
      }
    } catch (err) {
      invalidCount++;
      const msg = `Conversion/processing error: ${err.message}`;
      errorReasons.push(msg);
      if (sampleErrors.length < 25) {
        sampleErrors.push({ row: i + 1, errors: [msg], warnings: [] });
      }
    }
  }

  console.log('\n📊 Summary');
  console.log(' - Valid rows   :', validCount);
  console.log(' - Invalid rows :', invalidCount);

  if (errorReasons.length) {
    const ranked = tally(errorReasons);
    console.log('\n❗ Top rejection reasons:');
    for (const [reason, count] of ranked.slice(0, 10)) {
      console.log(` - (${count}) ${reason}`);
    }
  } else {
    console.log('\n✅ No rejection reasons found.');
  }

  if (sampleErrors.length) {
    console.log('\n🧪 Sample invalid rows (up to 25):');
    for (const s of sampleErrors) {
      console.log(` Row ${s.row}:`);
      for (const e of s.errors) console.log('   -', e);
      if (s.warnings && s.warnings.length) {
        for (const w of s.warnings) console.log('   (warn)', w);
      }
    }
  }

  if (db && db.end) await db.end();
}

main().catch(err => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});

