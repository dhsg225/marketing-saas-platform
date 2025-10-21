// [2025-10-09] - Apply Content Ideas Schema
// This script applies the content_ideas table schema to the database

const { query, testConnection } = require('./config');
const fs = require('fs');
const path = require('path');

async function applyContentIdeasSchema() {
  try {
    console.log('🔄 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    console.log('🔄 Applying content_ideas schema...');
    
    // Read and execute the schema file
    const schemaPath = path.join(__dirname, 'content_ideas_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as one statement to avoid dependency issues
    await query(schema);
    
    console.log('✅ Content ideas schema applied successfully!');
    
    // Verify the table was created
    try {
      const result = await query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'content_ideas' 
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Content ideas table structure:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } catch (verifyError) {
      console.log('⚠️  Could not verify table structure, but schema was applied');
    }
    
  } catch (error) {
    console.error('❌ Error applying content ideas schema:', error.message);
    process.exit(1);
  }
}

// Run the script
applyContentIdeasSchema();
