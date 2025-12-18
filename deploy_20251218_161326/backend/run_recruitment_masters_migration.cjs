// Recruitment Masters Migration Script - Creates all 3 recruitment master tables
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runRecruitmentMastersMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'payroll_system2'
    });
    
    console.log('✅ Database connected successfully');
    
    // =====================================================
    // 1. CREATE RECRUITMENT SOURCES TABLE
    // =====================================================
    console.log('🔄 Creating recruitment_sources table...');
    
    const [sourceTables] = await connection.execute("SHOW TABLES LIKE 'recruitment_sources'");
    
    if (sourceTables.length === 0) {
      await connection.execute(`
        CREATE TABLE \`recruitment_sources\` (
          \`sourceId\` int(11) NOT NULL AUTO_INCREMENT,
          \`sourceName\` varchar(100) NOT NULL COMMENT 'Recruitment source name',
          \`description\` text DEFAULT NULL COMMENT 'Optional description',
          \`isActive\` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Active status',
          \`created_at\` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Record creation timestamp',
          \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Record update timestamp',
          PRIMARY KEY (\`sourceId\`),
          UNIQUE KEY \`unique_source_name\` (\`sourceName\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Recruitment sources master data'
      `);
      console.log('✅ recruitment_sources table created');
      
      // Insert default sources
      const defaultSources = [
        { name: 'Indeed', desc: 'Job applications from Indeed job portal' },
        { name: 'Candidate Reference', desc: 'Applications through candidate referrals' },
        { name: 'Employee Reference', desc: 'Applications through employee referrals' },
        { name: 'Walk-In', desc: 'Direct walk-in applications' }
      ];
      
      for (const source of defaultSources) {
        await connection.execute(
          'INSERT INTO recruitment_sources (sourceName, description) VALUES (?, ?)',
          [source.name, source.desc]
        );
      }
      console.log('✅ Default recruitment sources inserted');
    } else {
      console.log('⚠️ recruitment_sources table already exists');
    }
    
    // =====================================================
    // 2. CREATE RECRUITMENT PIPELINES TABLE
    // =====================================================
    console.log('🔄 Creating recruitment_pipelines table...');
    
    const [pipelineTables] = await connection.execute("SHOW TABLES LIKE 'recruitment_pipelines'");
    
    if (pipelineTables.length === 0) {
      await connection.execute(`
        CREATE TABLE \`recruitment_pipelines\` (
          \`pipelineId\` int(11) NOT NULL AUTO_INCREMENT,
          \`pipelineName\` varchar(100) NOT NULL COMMENT 'Pipeline stage name',
          \`description\` text DEFAULT NULL COMMENT 'Optional description',
          \`stageOrder\` int(11) NOT NULL DEFAULT 0 COMMENT 'Order of stage in pipeline',
          \`isActive\` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Active status',
          \`created_at\` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Record creation timestamp',
          \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Record update timestamp',
          PRIMARY KEY (\`pipelineId\`),
          UNIQUE KEY \`unique_pipeline_name\` (\`pipelineName\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Recruitment pipeline stages master data'
      `);
      console.log('✅ recruitment_pipelines table created');
      
      // Insert default pipelines
      const defaultPipelines = [
        { name: 'HR Screening', desc: 'Initial HR screening stage', order: 1 },
        { name: 'Screening Reject', desc: 'Rejected at screening stage', order: 2 },
        { name: 'R1', desc: 'First round of interviews', order: 3 },
        { name: 'R1 Reject', desc: 'Rejected after first round', order: 4 },
        { name: 'R2', desc: 'Second round of interviews', order: 5 },
        { name: 'R2 Reject', desc: 'Rejected after second round', order: 6 },
        { name: 'Offered', desc: 'Job offer extended to candidate', order: 7 },
        { name: 'Onboarded', desc: 'Candidate successfully onboarded', order: 8 }
      ];
      
      for (const pipeline of defaultPipelines) {
        await connection.execute(
          'INSERT INTO recruitment_pipelines (pipelineName, description, stageOrder) VALUES (?, ?, ?)',
          [pipeline.name, pipeline.desc, pipeline.order]
        );
      }
      console.log('✅ Default recruitment pipelines inserted');
    } else {
      console.log('⚠️ recruitment_pipelines table already exists');
    }
    
    // =====================================================
    // 3. CREATE RECRUITMENT PLATFORMS TABLE
    // =====================================================
    console.log('🔄 Creating recruitment_platforms table...');
    
    const [platformTables] = await connection.execute("SHOW TABLES LIKE 'recruitment_platforms'");
    
    if (platformTables.length === 0) {
      await connection.execute(`
        CREATE TABLE \`recruitment_platforms\` (
          \`platformId\` int(11) NOT NULL AUTO_INCREMENT,
          \`platformName\` varchar(100) NOT NULL COMMENT 'Platform name',
          \`description\` text DEFAULT NULL COMMENT 'Optional description',
          \`isActive\` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Active status',
          \`created_at\` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Record creation timestamp',
          \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Record update timestamp',
          PRIMARY KEY (\`platformId\`),
          UNIQUE KEY \`unique_platform_name\` (\`platformName\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Recruitment platforms master data'
      `);
      console.log('✅ recruitment_platforms table created');
      
      // Insert default platforms
      const defaultPlatforms = [
        { name: 'National Stock Exchange', desc: 'National Stock Exchange trading platform' },
        { name: 'Forex', desc: 'Foreign exchange trading platform' }
      ];
      
      for (const platform of defaultPlatforms) {
        await connection.execute(
          'INSERT INTO recruitment_platforms (platformName, description) VALUES (?, ?)',
          [platform.name, platform.desc]
        );
      }
      console.log('✅ Default recruitment platforms inserted');
    } else {
      console.log('⚠️ recruitment_platforms table already exists');
    }
    
    // =====================================================
    // 4. CREATE INDEXES FOR PERFORMANCE
    // =====================================================
    console.log('🔄 Creating performance indexes...');
    
    try {
      await connection.execute('CREATE INDEX idx_recruitment_sources_active ON recruitment_sources(isActive)');
      console.log('✅ recruitment_sources index created');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ recruitment_sources index already exists');
      } else {
        console.error('❌ Error creating recruitment_sources index:', err.message);
      }
    }
    
    try {
      await connection.execute('CREATE INDEX idx_recruitment_pipelines_active ON recruitment_pipelines(isActive)');
      await connection.execute('CREATE INDEX idx_recruitment_pipelines_order ON recruitment_pipelines(stageOrder)');
      console.log('✅ recruitment_pipelines indexes created');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ recruitment_pipelines indexes already exist');
      } else {
        console.error('❌ Error creating recruitment_pipelines indexes:', err.message);
      }
    }
    
    try {
      await connection.execute('CREATE INDEX idx_recruitment_platforms_active ON recruitment_platforms(isActive)');
      console.log('✅ recruitment_platforms index created');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ recruitment_platforms index already exists');
      } else {
        console.error('❌ Error creating recruitment_platforms index:', err.message);
      }
    }
    
    // =====================================================
    // 5. FINAL VERIFICATION
    // =====================================================
    console.log('🔍 Final verification...');
    
    const [sources] = await connection.execute('SELECT sourceId, sourceName FROM recruitment_sources ORDER BY sourceName');
    console.log('✅ Recruitment Sources:');
    sources.forEach(source => {
      console.log(`   - ${source.sourceId}: ${source.sourceName}`);
    });
    
    const [pipelines] = await connection.execute('SELECT pipelineId, pipelineName, stageOrder FROM recruitment_pipelines ORDER BY stageOrder');
    console.log('✅ Recruitment Pipelines:');
    pipelines.forEach(pipeline => {
      console.log(`   - ${pipeline.pipelineId}: ${pipeline.pipelineName} (Order: ${pipeline.stageOrder})`);
    });
    
    const [platforms] = await connection.execute('SELECT platformId, platformName FROM recruitment_platforms ORDER BY platformName');
    console.log('✅ Recruitment Platforms:');
    platforms.forEach(platform => {
      console.log(`   - ${platform.platformId}: ${platform.platformName}`);
    });
    
    console.log('🎉 Recruitment masters migration completed successfully!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Create backend services and controllers');
    console.log('2. Add API routes to server.js');
    console.log('3. Update Master Data interface to include new modules');
    console.log('4. Update recruitment form to use master data dropdowns');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('1. Check your database connection settings in .env file');
    console.error('2. Ensure your database exists');
    console.error('3. Verify database user has CREATE and INSERT permissions');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
console.log('🚀 Starting Recruitment Masters Migration...');
console.log('================================================');
runRecruitmentMastersMigration();