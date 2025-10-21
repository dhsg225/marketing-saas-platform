const { query } = require('./config');
const fs = require('fs');
const path = require('path');

async function updateDatabase() {
  try {
    console.log('🔄 Updating database with Content Playbook Module schema...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'update_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          await query(statement);
        } catch (error) {
          // Some statements might fail if they already exist, that's okay
          if (error.message.includes('already exists') || error.message.includes('does not exist')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists or not applicable)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Database update completed successfully!');
    
    // Test the new tables
    console.log('🧪 Testing new tables...');
    
    const testQueries = [
      'SELECT COUNT(*) FROM projects',
      'SELECT COUNT(*) FROM project_hashtags', 
      'SELECT COUNT(*) FROM content_recipes',
      'SELECT COUNT(*) FROM channel_templates',
      'SELECT COUNT(*) FROM content_generations'
    ];
    
    for (const testQuery of testQueries) {
      try {
        const result = await query(testQuery);
        console.log(`✅ ${testQuery}: ${result.rows[0].count} rows`);
      } catch (error) {
        console.error(`❌ ${testQuery}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database update failed:', error);
  } finally {
    process.exit(0);
  }
}

updateDatabase();
