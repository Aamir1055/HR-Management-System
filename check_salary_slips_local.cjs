const mysql = require('mysql2/promise');

async function checkSalarySlips() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // Adjust if you have a password
            database: 'payroll_system2'
        });

        console.log('Connected to local database successfully!');

        // Check if salary_slips table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'salary_slips'"
        );

        if (tables.length === 0) {
            console.log('❌ salary_slips table does not exist!');
            return;
        }

        console.log('✅ salary_slips table exists');

        // Get table structure
        const [structure] = await connection.execute('DESCRIBE salary_slips');
        console.log('\n📋 Table Structure:');
        structure.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
        });

        // Count total records
        const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM salary_slips');
        const totalRecords = countResult[0].total;
        console.log(`\n📊 Total salary slip records: ${totalRecords}`);

        if (totalRecords > 0) {
            // Get recent records
            const [recentRecords] = await connection.execute(`
                SELECT employee_id, employee_name, year, month, month_name, 
                       gross_salary, net_salary, status, generated_at
                FROM salary_slips 
                ORDER BY generated_at DESC 
                LIMIT 10
            `);

            console.log('\n📋 Recent 10 salary slips:');
            recentRecords.forEach(record => {
                console.log(`  ${record.employee_id} - ${record.employee_name} (${record.month_name} ${record.year}) - Net: AED ${record.net_salary} - Status: ${record.status}`);
            });

            // Get summary by month/year
            const [summary] = await connection.execute(`
                SELECT year, month, month_name, COUNT(*) as count, 
                       SUM(gross_salary) as total_gross,
                       SUM(net_salary) as total_net
                FROM salary_slips 
                GROUP BY year, month, month_name
                ORDER BY year DESC, month DESC
                LIMIT 5
            `);

            console.log('\n📈 Summary by month:');
            summary.forEach(sum => {
                console.log(`  ${sum.month_name} ${sum.year}: ${sum.count} slips, Gross: AED ${sum.total_gross}, Net: AED ${sum.total_net}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('Database payroll_system2 does not exist!');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('Cannot connect to MySQL server. Is it running?');
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkSalarySlips();
