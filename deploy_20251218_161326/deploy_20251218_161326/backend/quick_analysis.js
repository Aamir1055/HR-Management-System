const { readExcelFile, validateExcelStructure, processExcelRow, processDateFields } = require('./utils/excelUtils');
const { RequiredFields } = require('./models/Employee');
const EmployeeValidationService = require('./services/EmployeeValidationService');
const EmployeeImportService = require('./services/EmployeeImportService');

async function analyze() {
  const filePath = 'C:\\Users\\bazaa\\Downloads\\employees_2025-09-29.xlsx';
  const excelData = readExcelFile(filePath);
  const structure = validateExcelStructure(excelData, RequiredFields.import);

  const mockDb = {
    query: async (sql, params) => {
      if (/SELECT id FROM offices/i.test(sql)) return [[{ id: 1 }]];
      if (/SELECT id FROM positions/i.test(sql)) return [[{ id: 1 }]];
      return [[]];
    }
  };

  const mockRepo = { findById: async () => null };
  const validationService = new EmployeeValidationService(mockRepo);
  const importService = new EmployeeImportService(mockRepo, validationService, null);

  let validCount = 0, invalidCount = 0;
  const errorCounts = new Map();
  const sampleInvalid = [];

  console.log(`Analyzing all ${excelData.data.length} rows...`);

  for (let i = 0; i < excelData.data.length; i++) {
    try {
      const row = excelData.data[i];
      const processedRow = processExcelRow(row, structure.columnMapping);
      const withDates = processDateFields(processedRow);
      const employeeData = await importService.convertExcelRowToEmployee(withDates, { db: mockDb });
      
      const validation = validationService.validateForImport(employeeData, i);
      
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
        validation.errors.forEach(err => {
          const key = err.replace(/Row \d+: /, '');
          errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
        });
        
        if (sampleInvalid.length < 5) {
          sampleInvalid.push({
            row: i + 1,
            employeeId: row['Employee ID'],
            name: row['First Name'] + ' ' + row['Last Name'],
            errors: validation.errors
          });
        }
      }
    } catch (err) {
      invalidCount++;
      const key = 'Processing Error: ' + err.message;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      
      if (sampleInvalid.length < 5) {
        sampleInvalid.push({
          row: i + 1,
          employeeId: row['Employee ID'],
          name: row['First Name'] + ' ' + row['Last Name'],
          errors: [err.message]
        });
      }
    }
  }

  console.log(`\n📊 RESULTS:`);
  console.log(`✅ Valid rows: ${validCount}`);
  console.log(`❌ Invalid rows: ${invalidCount}`);
  console.log(`📈 Success rate: ${((validCount / excelData.data.length) * 100).toFixed(1)}%`);

  console.log(`\n🔝 Top validation errors:`);
  [...errorCounts.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0, 8)
    .forEach(([error, count]) => {
      console.log(`  ${count}x ${error}`);
    });

  console.log(`\n🧪 Sample invalid rows:`);
  sampleInvalid.forEach(sample => {
    console.log(`  Row ${sample.row} (${sample.employeeId} - ${sample.name}):`);
    sample.errors.forEach(err => console.log(`    - ${err}`));
  });
}

analyze().catch(console.error);
