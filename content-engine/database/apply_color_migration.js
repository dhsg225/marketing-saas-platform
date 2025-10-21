const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./config');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const applyColorMigration = async () => {
  console.log('🔄 Testing database connection...');
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot apply migration without a database connection.');
    process.exit(1);
  }

  console.log('🔄 Applying color column to content_recipes...');
  try {
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, 'add_color_to_recipes.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire migration as one statement
    await query(migration);
    
    console.log('✅ Color column added to content_recipes successfully!');
    
    // Verify the column was added
    try {
      const result = await query(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'content_recipes' AND column_name = 'color'
      `);
      
      if (result.rows.length > 0) {
        console.log('📋 Color column structure:');
        result.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
        });
      }
    } catch (verifyError) {
      console.log('⚠️  Could not verify column structure, but migration was applied');
    }
    
  } catch (error) {
    console.error('❌ Error applying color migration:', error.message);
    process.exit(1);
  }
};

applyColorMigration();

