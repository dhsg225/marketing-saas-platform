const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./config');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const applyScheduleMigration = async () => {
  console.log('🔄 Testing database connection...');
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot apply migration without a database connection.');
    process.exit(1);
  }

  console.log('🔄 Applying schedule fields to content_recipes...');
  try {
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, 'add_schedule_fields.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire migration as one statement
    await query(migration);
    
    console.log('✅ Schedule fields added to content_recipes successfully!');
    
    // Verify the columns were added
    try {
      const result = await query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'content_recipes' AND column_name IN ('scheduled_date', 'scheduled_time')
        ORDER BY column_name
      `);
      
      if (result.rows.length > 0) {
        console.log('📋 Schedule fields structure:');
        result.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
      }
    } catch (verifyError) {
      console.log('⚠️  Could not verify column structure, but migration was applied');
    }
    
  } catch (error) {
    console.error('❌ Error applying schedule migration:', error.message);
    process.exit(1);
  }
};

applyScheduleMigration();
