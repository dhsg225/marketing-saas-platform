// [October 15, 2025] - Apply Social Account Connections Schema Migration
// Purpose: Create social_account_connections table for multi-tenant Late API isolation

const fs = require('fs');
const path = require('path');
const { pool } = require('./config');

async function applySocialConnectionsSchema() {
  console.log('🚀 Starting Social Account Connections schema migration...\n');

  try {
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, 'social_account_connections_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    console.log('📝 Creating social_account_connections table...');
    await pool.query(schemaSql);
    console.log('✅ Table created successfully\n');

    // Verify the table was created
    console.log('🔍 Verifying table structure...');
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'social_account_connections'
      ORDER BY ordinal_position;
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ Table verified. Columns:');
      tableCheck.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
      });
      console.log('');
    } else {
      console.log('❌ Table verification failed - no columns found\n');
      process.exit(1);
    }

    // Check indexes
    console.log('🔍 Verifying indexes...');
    const indexCheck = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'social_account_connections';
    `);

    if (indexCheck.rows.length > 0) {
      console.log(`✅ ${indexCheck.rows.length} indexes created:`);
      indexCheck.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
      console.log('');
    }

    console.log('✅ ✅ ✅ Social Account Connections schema migration completed successfully! ✅ ✅ ✅\n');
    console.log('📊 Summary:');
    console.log(`   - Table: social_account_connections`);
    console.log(`   - Columns: ${tableCheck.rows.length}`);
    console.log(`   - Indexes: ${indexCheck.rows.length}`);
    console.log(`   - Security: Application-level authorization (enforced in API routes)`);
    console.log('\n🎯 Next Step: Update Late API routes with authorization checks\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
applySocialConnectionsSchema();

