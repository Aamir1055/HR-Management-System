/**
 * Compare Excel vs DB to explain why only a subset of rows are imported
 */

const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const fs = require('fs');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'payroll_system2'
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function fixEmail(email) {
  if (!email) return '';
  let fixed = email.toString().trim().toLowerCase();
  fixed = fixed.replace(/\s+/g, '');
  fixed = fixed.replace(/,,+/g, '.');
  fixed = fixed.replace(/\.{2,}/g, '.');
  fixed = fixed.replace(/@+/g, '@');
  if (fixed.includes('@') && !fixed.includes('.') && !fixed.endsWith('.com')) fixed += '.com';
  fixed = fixed.replace(/@gmial\./g, '@gmail.').replace(/@gmai\./g, '@gmail.').replace(/@yahooo\./g, '@yahoo.').replace(/@hotmial\./g, '@hotmail.');
  return fixed;
}

async function compareExcelVsDb(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const conn = await mysql.createConnection(DB_CONFIG);

  // Load DB data
  const [[{ totalEmployees }]] = await conn.execute('SELECT COUNT(*) AS totalEmployees FROM employees');
  const [dbEmployees] = await conn.execute('SELECT employeeId, email FROM employees');
  const [dbOffices] = await conn.execute('SELECT name FROM offices');
  const [dbPositions] = await conn.execute('SELECT title FROM positions');

  const emailSet = new Set(dbEmployees.map(r => (r.email || '').toLowerCase()));
  const empIdSet = new Set(dbEmployees.map(r => String(r.employeeId)));
  const officeSet = new Set(dbOffices.map(r => r.name));
  const positionSet = new Set(dbPositions.map(r => r.title));

  // Load Excel
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const summary = {
    filePath,
    totalRows: rows.length,
    dbEmployeeCountBefore: totalEmployees,
    wouldInsert: 0,
    blockedDuplicateEmail: 0,
    blockedDuplicateEmployeeId: 0,
    blockedBothDup: 0,
    blockedInvalid: 0,
    invalidBreakdown: {
      missingRequired: 0,
      invalidEmail: 0,
      invalidSalary: 0,
      invalidStatus: 0,
      officeNotFound: 0,
      positionNotFound: 0
    },
    samples: {
      duplicates: [],
      invalids: []
    }
  };

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const employeeId = row['Employee ID'] || row['EmployeeID'] || row['employee_id'] || row['ID'];
    const firstName = row['First Name'] || row.FirstName || row.first_name || row.Name;
    const lastName = row['Last Name'] || row.LastName || row.last_name || '';
    const emailRaw = row.Email || row.email || row.EMAIL;
    const email = fixEmail(emailRaw);
    const office = (row.Office || row.office || row.OFFICE || '').toString().trim();
    const position = (row.Position || row.position || row.POSITION || row.Role || row.role || '').toString().trim();
    const salary = row['Monthly Salary'] || row.Salary || row.salary || row.SALARY;
    const status = (row.Status || row.status || row.STATUS || '').toString().trim().toLowerCase();

    let invalid = false;
    let reasons = [];

    // Required fields
    if (!employeeId || !firstName || !email || !office || !position || !salary || !status) {
      summary.invalidBreakdown.missingRequired++;
      invalid = true;
      reasons.push('missing required');
    }

    // Email
    if (email && !EMAIL_REGEX.test(email)) {
      summary.invalidBreakdown.invalidEmail++;
      invalid = true;
      reasons.push('invalid email');
    }

    // Salary
    if (salary !== undefined && salary !== null) {
      const sn = parseFloat(salary);
      if (isNaN(sn) || sn <= 0) {
        summary.invalidBreakdown.invalidSalary++;
        invalid = true;
        reasons.push('invalid salary');
      }
    }

    // Status
    if (status && !['active', 'inactive'].includes(status)) {
      summary.invalidBreakdown.invalidStatus++;
      invalid = true;
      reasons.push('invalid status');
    }

    // Office/Position existence
    if (office && !officeSet.has(office)) {
      summary.invalidBreakdown.officeNotFound++;
      invalid = true;
      reasons.push('office not found');
    }
    if (position && !positionSet.has(position)) {
      summary.invalidBreakdown.positionNotFound++;
      invalid = true;
      reasons.push('position not found');
    }

    if (invalid) {
      summary.blockedInvalid++;
      if (summary.samples.invalids.length < 10) {
        summary.samples.invalids.push({ row: rowNum, employeeId, email, office, position, salary, status, reasons });
      }
      return;
    }

    // Duplicates in DB (most likely reason for low inserted count)
    const empIdStr = String(employeeId).trim();
    const emailStr = (email || '').toLowerCase();
    const dupId = empIdSet.has(empIdStr);
    const dupEmail = emailSet.has(emailStr);

    if (dupId && dupEmail) {
      summary.blockedBothDup++;
      if (summary.samples.duplicates.length < 10) {
        summary.samples.duplicates.push({ row: rowNum, reason: 'duplicate employeeId and email', employeeId: empIdStr, email: emailStr });
      }
      return;
    }
    if (dupId) {
      summary.blockedDuplicateEmployeeId++;
      if (summary.samples.duplicates.length < 10) {
        summary.samples.duplicates.push({ row: rowNum, reason: 'duplicate employeeId', employeeId: empIdStr, email: emailStr });
      }
      return;
    }
    if (dupEmail) {
      summary.blockedDuplicateEmail++;
      if (summary.samples.duplicates.length < 10) {
        summary.samples.duplicates.push({ row: rowNum, reason: 'duplicate email', employeeId: empIdStr, email: emailStr });
      }
      return;
    }

    summary.wouldInsert++;
  });

  await conn.end();
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.log('Usage: node compare_excel_vs_db.js <excel_file_path>');
    process.exit(1);
  }
  try {
    const summary = await compareExcelVsDb(args[0]);
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXCEL vs DB COMPARISON');
    console.log('='.repeat(80));
    console.log(`File: ${summary.filePath}`);
    console.log(`Total rows in file: ${summary.totalRows}`);
    console.log(`Employees already in DB (before): ${summary.dbEmployeeCountBefore}`);
    console.log(`\n✅ Would insert (new rows): ${summary.wouldInsert}`);
    console.log(`🚫 Blocked by duplicates:`);
    console.log(`   - Duplicate employeeId: ${summary.blockedDuplicateEmployeeId}`);
    console.log(`   - Duplicate email: ${summary.blockedDuplicateEmail}`);
    console.log(`   - Both duplicate: ${summary.blockedBothDup}`);
    console.log(`🚫 Blocked by validation: ${summary.blockedInvalid}`);
    console.log('   Breakdown:');
    Object.entries(summary.invalidBreakdown).forEach(([k, v]) => console.log(`   - ${k}: ${v}`));

    if (summary.samples.duplicates.length) {
      console.log('\n🔁 Sample duplicates (first 10):');
      summary.samples.duplicates.forEach(s => console.log(`   Row ${s.row}: ${s.reason} (ID=${s.employeeId}, email=${s.email})`));
    }
    if (summary.samples.invalids.length) {
      console.log('\n❌ Sample invalid rows (first 10):');
      summary.samples.invalids.forEach(s => console.log(`   Row ${s.row}: reasons=${s.reasons.join(', ')} (ID=${s.employeeId}, email=${s.email}, office=${s.office}, position=${s.position})`));
    }

    console.log('\n💡 Note: If "Would insert" equals the importer count (234), the rest are already in the DB (duplicates) or invalid.');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

