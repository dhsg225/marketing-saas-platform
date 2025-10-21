const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./config');

async function applyMigration() {
  try {
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed. Exiting...');
      process.exit(1);
    }

    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, 'add_client_reference_documents.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying Client Reference Documents migration...');
    await query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('📋 Created table: client_reference_documents');
    console.log('🔒 Applied RLS policies for security');
    console.log('📊 Created indexes for performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists - migration may have been applied before');
    } else {
      console.error('Full error:', error);
      process.exit(1);
    }
  }
}

// Run the migration
applyMigration();
