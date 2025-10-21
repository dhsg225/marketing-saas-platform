const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Manual Distribution Management migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add_manual_distribution_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await client.query(sql);
    
    console.log('✅ Manual Distribution Management migration completed successfully!');
    console.log('📋 Tables created:');
    console.log('   - manual_distribution_lists');
    console.log('   - distribution_target_groups');
    console.log('   - distribution_rotation_schedules');
    console.log('   - distribution_rotation_rules');
    console.log('   - distribution_log');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMigration().catch(console.error);
