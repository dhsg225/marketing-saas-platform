// [2025-10-19] - Apply image_prompt field migration
// Adds image_prompt field to posts and content_ideas tables

const fs = require('fs');
const path = require('path');
const { query } = require('./config');

async function applyImagePromptMigration() {
  try {
    console.log('🖼️  Applying image_prompt field migration...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'add_image_prompt_field.sql');
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
    
    console.log('✅ Image prompt field migration completed successfully');
    
    // Verify the fields were added
    const postsCheck = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts' AND column_name = 'image_prompt'
    `);
    
    const contentIdeasCheck = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'content_ideas' AND column_name = 'image_prompt'
    `);
    
    if (postsCheck.rows.length > 0) {
      console.log('✅ image_prompt field added to posts table');
    } else {
      console.log('❌ Failed to add image_prompt field to posts table');
    }
    
    if (contentIdeasCheck.rows.length > 0) {
      console.log('✅ image_prompt field added to content_ideas table');
    } else {
      console.log('❌ Failed to add image_prompt field to content_ideas table');
    }
    
  } catch (error) {
    console.error('❌ Error applying image_prompt migration:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  applyImagePromptMigration()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { applyImagePromptMigration };
