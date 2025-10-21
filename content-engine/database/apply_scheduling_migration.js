const { query } = require('./config');
const fs = require('fs');
const path = require('path');

async function applySchedulingMigration() {
  console.log('🔄 Applying scheduling fields migration...');
  const migrationSql = fs.readFileSync(path.join(__dirname, 'add_scheduling_fields.sql'), 'utf8');
  const statements = migrationSql.split(';').filter(s => s.trim() !== '');

  for (const statement of statements) {
    try {
      if (statement.trim() !== '') {
        console.log('📝 Executing:', statement.trim().substring(0, 70) + '...');
        await query(statement);
      }
    } catch (error) {
      // Ignore 'column already exists' errors for idempotency
      if (error.message.includes('already exists')) {
        console.log('⚠️  Column or index already exists, skipping:', error.message.split('\n')[0]);
      } else {
        console.error('❌ Migration failed:', error);
        throw error; // Re-throw other errors
      }
    }
  }
  console.log('✅ Scheduling fields migration completed successfully');
}

module.exports = { applySchedulingMigration };

