const { pool } = require('./config');

async function checkModelConfigs() {
  try {
    console.log('📋 Checking model_configs table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'model_configs'
      ORDER BY ordinal_position
    `);
    
    console.log('model_configs columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${row.column_default ? `DEFAULT: ${row.column_default}` : ''}`);
    });
    
    console.log('\n📊 Sample data:');
    const sampleResult = await pool.query('SELECT * FROM model_configs LIMIT 2');
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
      });
    } else {
      console.log('  No data found');
    }
    
  } catch (error) {
    console.error('Error checking model_configs:', error);
  } finally {
    pool.end();
  }
}

checkModelConfigs();
