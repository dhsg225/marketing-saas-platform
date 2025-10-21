const fs = require('fs');
const path = require('path');
const { pool } = require('./config');

/**
 * Apply AI Abstraction Layer Schema
 * This script creates the necessary tables and seed data for the AI abstraction layer
 */

async function applySchema() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting AI Abstraction Layer schema migration...\n');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'ai_abstraction_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    console.log('📋 Creating tables and indexes...');
    await client.query(schemaSql);
    
    console.log('✅ Schema applied successfully!\n');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('model_configs', 'ai_generation_jobs', 'user_api_keys')
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check seed data
    const modelCount = await client.query('SELECT COUNT(*) as count FROM model_configs');
    console.log(`\n🌱 Seed data: ${modelCount.rows[0].count} model configurations loaded`);
    
    // Display loaded models
    const models = await client.query('SELECT model_id, provider_name, model_type FROM model_configs ORDER BY model_id');
    console.log('\n📱 Available AI Models:');
    models.rows.forEach(model => {
      console.log(`   • ${model.model_id} - ${model.provider_name} (${model.model_type})`);
    });
    
    console.log('\n✨ AI Abstraction Layer is ready!');
    
  } catch (error) {
    console.error('❌ Error applying schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  applySchema()
    .then(() => {
      console.log('\n🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { applySchema };

