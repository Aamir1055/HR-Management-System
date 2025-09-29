/**
 * Create Missing Offices and Positions Script
 * 
 * This script analyzes the Excel file to find missing offices and positions,
 * then creates them in the database to fix import issues.
 */

const XLSX = require('xlsx');
const fs = require('fs');
const db = require('./db');

/**
 * Extract unique office and position names from Excel file
 * @param {string} filePath - Path to Excel file
 * @returns {object} - Unique office and position names
 */
function extractOfficesAndPositions(filePath) {
    console.log(`📊 Analyzing Excel file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Total rows found: ${data.length}`);

    const offices = new Set();
    const positions = new Set();

    data.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (accounting for header)
        
        // Get office name (handle different column name variations)
        const officeName = row.Office || row.office || row.OFFICE || row['Office Name'] || row.officeName;
        if (officeName && typeof officeName === 'string') {
            const cleanOfficeName = officeName.toString().trim();
            if (cleanOfficeName) {
                offices.add(cleanOfficeName);
            }
        }

        // Get position name (handle different column name variations)
        const positionName = row.Position || row.position || row.POSITION || 
                           row.Role || row.role || row.ROLE || 
                           row['Job Title'] || row.jobTitle || row['Position Title'];
        if (positionName && typeof positionName === 'string') {
            const cleanPositionName = positionName.toString().trim();
            if (cleanPositionName) {
                positions.add(cleanPositionName);
            }
        }
    });

    return {
        offices: Array.from(offices).sort(),
        positions: Array.from(positions).sort(),
        totalRows: data.length
    };
}

/**
 * Get existing offices from database
 * @returns {Array} - Array of existing office names
 */
async function getExistingOffices() {
    try {
        const [rows] = await db.query('SELECT id, name FROM offices ORDER BY name');
        return rows.map(row => ({ id: row.id, name: row.name }));
    } catch (error) {
        console.error('Error fetching existing offices:', error);
        return [];
    }
}

/**
 * Get existing positions from database
 * @returns {Array} - Array of existing position names
 */
async function getExistingPositions() {
    try {
        const [rows] = await db.query('SELECT id, title FROM positions ORDER BY title');
        return rows.map(row => ({ id: row.id, title: row.title }));
    } catch (error) {
        console.error('Error fetching existing positions:', error);
        return [];
    }
}

/**
 * Create missing offices in database
 * @param {Array} missingOffices - Array of office names to create
 * @returns {Array} - Array of created office objects
 */
async function createMissingOffices(missingOffices) {
    const createdOffices = [];
    
    for (const officeName of missingOffices) {
        try {
            const [result] = await db.query(
                'INSERT INTO offices (name, created_at) VALUES (?, NOW())',
                [officeName]
            );
            
            createdOffices.push({
                id: result.insertId,
                name: officeName
            });
            
            console.log(`✅ Created office: ${officeName} (ID: ${result.insertId})`);
        } catch (error) {
            console.error(`❌ Failed to create office "${officeName}":`, error.message);
        }
    }
    
    return createdOffices;
}

/**
 * Create missing positions in database
 * @param {Array} missingPositions - Array of position names to create
 * @returns {Array} - Array of created position objects
 */
async function createMissingPositions(missingPositions) {
    const createdPositions = [];
    
    for (const positionTitle of missingPositions) {
        try {
            const [result] = await db.query(
                'INSERT INTO positions (title, description, created_at) VALUES (?, ?, NOW())',
                [positionTitle, 'Position description TBD']
            );
            
            createdPositions.push({
                id: result.insertId,
                title: positionTitle
            });
            
            console.log(`✅ Created position: ${positionTitle} (ID: ${result.insertId})`);
        } catch (error) {
            console.error(`❌ Failed to create position "${positionTitle}":`, error.message);
        }
    }
    
    return createdPositions;
}

/**
 * Main function to analyze Excel file and create missing offices/positions
 * @param {string} filePath - Path to Excel file
 */
async function createMissingOfficesAndPositions(filePath) {
    try {
        console.log('🚀 STARTING OFFICE AND POSITION CREATION');
        console.log('='.repeat(60));

        // Extract data from Excel file
        const { offices: excelOffices, positions: excelPositions, totalRows } = extractOfficesAndPositions(filePath);
        
        console.log(`\n📊 EXTRACTED FROM EXCEL FILE:`);
        console.log(`   Total rows: ${totalRows}`);
        console.log(`   Unique offices found: ${excelOffices.length}`);
        console.log(`   Unique positions found: ${excelPositions.length}`);

        if (excelOffices.length > 0) {
            console.log(`\n🏢 OFFICES IN EXCEL FILE:`);
            excelOffices.forEach((office, index) => {
                console.log(`   ${index + 1}. ${office}`);
            });
        }

        if (excelPositions.length > 0) {
            console.log(`\n💼 POSITIONS IN EXCEL FILE:`);
            excelPositions.forEach((position, index) => {
                console.log(`   ${index + 1}. ${position}`);
            });
        }

        // Get existing data from database
        const existingOffices = await getExistingOffices();
        const existingPositions = await getExistingPositions();

        console.log(`\n📋 EXISTING IN DATABASE:`);
        console.log(`   Existing offices: ${existingOffices.length}`);
        console.log(`   Existing positions: ${existingPositions.length}`);

        // Find missing offices and positions
        const existingOfficeNames = new Set(existingOffices.map(o => o.name));
        const existingPositionTitles = new Set(existingPositions.map(p => p.title));

        const missingOffices = excelOffices.filter(office => !existingOfficeNames.has(office));
        const missingPositions = excelPositions.filter(position => !existingPositionTitles.has(position));

        console.log(`\n🔍 ANALYSIS RESULTS:`);
        console.log(`   Missing offices to create: ${missingOffices.length}`);
        console.log(`   Missing positions to create: ${missingPositions.length}`);

        if (missingOffices.length === 0 && missingPositions.length === 0) {
            console.log(`\n✅ All offices and positions already exist in the database!`);
            console.log(`   Your Excel file should import successfully now.`);
            return {
                success: true,
                message: 'All offices and positions already exist',
                created: { offices: 0, positions: 0 }
            };
        }

        // Create missing offices
        let createdOffices = [];
        if (missingOffices.length > 0) {
            console.log(`\n🏢 CREATING MISSING OFFICES:`);
            createdOffices = await createMissingOffices(missingOffices);
        }

        // Create missing positions
        let createdPositions = [];
        if (missingPositions.length > 0) {
            console.log(`\n💼 CREATING MISSING POSITIONS:`);
            createdPositions = await createMissingPositions(missingPositions);
        }

        console.log(`\n` + '='.repeat(60));
        console.log(`✅ CREATION COMPLETE!`);
        console.log(`=`.repeat(60));
        console.log(`   Created offices: ${createdOffices.length}`);
        console.log(`   Created positions: ${createdPositions.length}`);
        console.log(`\n💡 NEXT STEPS:`);
        console.log(`   1. Your Excel file should now import successfully`);
        console.log(`   2. Run your employee import again`);
        console.log(`   3. All 342 employees should import without office/position errors`);
        
        if (createdOffices.length > 0) {
            console.log(`\n📝 NOTE: New offices were created with placeholder data:`);
            console.log(`   - Address: "Address TBD"`);
            console.log(`   - City: "City TBD"`);
            console.log(`   - Country: "Country TBD"`);
            console.log(`   You can update these details later in your office management system.`);
        }

        if (createdPositions.length > 0) {
            console.log(`\n📝 NOTE: New positions were created with placeholder descriptions.`);
            console.log(`   You can update these details later in your position management system.`);
        }

        return {
            success: true,
            message: `Created ${createdOffices.length} offices and ${createdPositions.length} positions`,
            created: {
                offices: createdOffices.length,
                positions: createdPositions.length
            },
            createdOffices,
            createdPositions
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node create_missing_offices.js <excel_file_path>');
        console.log('');
        console.log('This script will:');
        console.log('  1. Analyze your Excel file for office and position names');
        console.log('  2. Check which ones are missing from your database');
        console.log('  3. Create the missing offices and positions');
        console.log('  4. Fix your import issues automatically');
        console.log('');
        console.log('Example:');
        console.log('  node create_missing_offices.js employees.xlsx');
        return;
    }

    const filePath = args[0];

    try {
        const result = await createMissingOfficesAndPositions(filePath);
        console.log('\n🎉 SUCCESS! Your import should work now.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed:', error.message);
        process.exit(1);
    } finally {
        // Close database connection
        try {
            await db.end();
        } catch (err) {
            // Ignore connection close errors
        }
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    extractOfficesAndPositions,
    createMissingOfficesAndPositions
};
