/**
 * Apply Document Ingestion Schema
 * 
 * Creates the database tables for AI-powered document ingestion
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Database configuration (using same config as backend)
const pool = new Pool({
  user: process.env.SUPABASE_DB_USER || 'postgres',
  host: process.env.SUPABASE_DB_HOST || 'localhost',
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'password',
  port: process.env.SUPABASE_DB_PORT || 5432,
  ssl: process.env.SUPABASE_DB_HOST ? { rejectUnauthorized: false } : false
});

async function applyDocumentIngestionSchema() {
  const client = await pool.connect();
  
  try {
    console.log('📄 Starting document ingestion schema application...');
    
    // Read and execute the schema SQL file
    const schemaPath = path.join(__dirname, 'document_ingestion_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📊 Executing document ingestion schema...');
    await client.query(schemaSQL);
    
    console.log('✅ Document ingestion schema successfully applied!');
    
    // Verify tables were created
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('document_ingestions', 'extracted_content_items', 'content_mappings')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tablesCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Check views
    const viewsCheck = await client.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname IN ('document_ingestion_summary', 'content_items_with_context')
      ORDER BY viewname
    `);
    
    console.log('📊 Created views:');
    viewsCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.viewname}`);
    });
    
    console.log('\n🎉 Document ingestion system ready!');
    console.log('📝 Features:');
    console.log('   • AI-powered document parsing (CSV, Excel, PDF, TXT)');
    console.log('   • Content calendar extraction');
    console.log('   • Campaign brief analysis');
    console.log('   • Content ideas processing');
    console.log('   • Smart content mapping to system entities');
    console.log('   • Analytics and insights');
    
  } catch (error) {
    console.error('❌ Error applying document ingestion schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyDocumentIngestionSchema()
  .then(() => {
    console.log('🎉 Document ingestion schema application completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Document ingestion schema application failed:', error);
    process.exit(1);
  });
