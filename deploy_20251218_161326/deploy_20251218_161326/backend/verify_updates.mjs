import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'payroll_system2'
};

async function verifyUpdates() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database for verification');

        // Check a few specific emails that should have been updated
        const testEmails = [
            'amsoni0313@gmail.com',
            'faizasiddique886@gmail.com', 
            'amit.soni@company.com',
            'mdimran26533@gmail.com'
        ];

        for (const email of testEmails) {
            const [rows] = await connection.execute(
                'SELECT id, name, email, shift_timings FROM employees WHERE email = ?',
                [email]
            );
            
            if (rows.length > 0) {
                const employee = rows[0];
                console.log(`✓ ${employee.name} (${email}): ${employee.shift_timings || 'NULL'}`);
            } else {
                console.log(`✗ No employee found with email: ${email}`);
            }
        }

        // Also check total count of employees with non-null shift timings
        const [countResult] = await connection.execute(
            'SELECT COUNT(*) as updated_count FROM employees WHERE shift_timings IS NOT NULL AND shift_timings != ""'
        );
        
        console.log(`\nTotal employees with shift timings: ${countResult[0].updated_count}`);

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

verifyUpdates();
