const fs = require('fs');
const path = require('path');
const { pool } = require('./config');

async function applySignatureBlocksSchema() {
  try {
    console.log('📋 Applying signature blocks schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'signature_blocks_simple.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSQL);
    
    console.log('✅ Signature blocks schema applied successfully');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'signature_blocks'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Signature blocks table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error applying signature blocks schema:', error);
  } finally {
    pool.end();
  }
}

applySignatureBlocksSchema();
