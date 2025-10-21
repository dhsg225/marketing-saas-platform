// [2025-10-08] - Apply variants column migration to assets table
const { query, testConnection } = require('./config');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    // Test connection first
    console.log('🔌 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Cannot connect to database. Check your .env configuration.');
      process.exit(1);
    }

    // Read migration SQL
    const migrationPath = path.join(__dirname, 'add_variants_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Applying variants column migration...');
    
    // Execute migration
    await query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('📊 Assets table now has variants column for storing processed image sizes');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();

