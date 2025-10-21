const { pool } = require('./config');

async function checkTables() {
  try {
    console.log('📋 Checking current database tables...');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Current tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log(`\nTotal tables: ${result.rows.length}`);
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    pool.end();
  }
}

checkTables();
