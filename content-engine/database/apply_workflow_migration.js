// [2025-10-20] - Apply Content Workflow Migration
// Updates content_ideas table for two-stage approval process

const { query } = require('./config');
const fs = require('fs');
const path = require('path');

async function applyWorkflowMigration() {
  console.log('🔄 Applying content workflow migration...');

  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'update_content_workflow.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        try {
          await query(statement);
        } catch (error) {
          // If column already exists, that's okay
          if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
            console.log(`⚠️  Column already exists, skipping: ${statement.substring(0, 50)}...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Content workflow migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

module.exports = { applyWorkflowMigration };


