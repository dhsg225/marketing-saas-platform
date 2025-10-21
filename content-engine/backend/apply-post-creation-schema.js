// [2025-10-19] - Apply Post Creation System Schema
// Creates the database tables for dual-mode post creation

const { query } = require('../database/config');
const fs = require('fs');
const path = require('path');

async function applyPostCreationSchema() {
  try {
    console.log('🚀 Applying Post Creation System schema...');

    // Read the schema file
    const schemaPath = path.join(__dirname, '../database/post_creation_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('📝 Executing:', statement.substring(0, 50) + '...');
        await query(statement);
      }
    }

    console.log('✅ Post Creation System schema applied successfully!');
    console.log('📊 Created tables:');
    console.log('   - posts (main post container)');
    console.log('   - post_sections (By-Parts mode sections)');
    console.log('   - post_generation_history (AI generation tracking)');

  } catch (error) {
    console.error('❌ Error applying schema:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  applyPostCreationSchema()
    .then(() => {
      console.log('🎉 Schema application completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema application failed:', error);
      process.exit(1);
    });
}

module.exports = applyPostCreationSchema;
