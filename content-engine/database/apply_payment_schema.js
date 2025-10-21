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

async function applyPaymentSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Payment System schema migration...');
    
    console.log('📋 This will create payment system tables:');
    console.log('   - talent_payments (payment tracking)');
    console.log('   - talent_payouts (payout management)');
    console.log('   - payment_disputes (dispute resolution)');
    console.log('   - platform_earnings (revenue tracking)');
    console.log('   - Views and indexes for reporting');
    
    // Read and execute the payment schema SQL file
    const schemaPath = path.join(__dirname, 'payment_system_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 Executing payment schema...');
    await client.query(schemaSQL);
    
    console.log('✅ Payment system schema successfully applied!');
    console.log('');
    console.log('🎯 Payment system features:');
    console.log('   • Manual payment processing');
    console.log('   • Escrow system (7-day hold)');
    console.log('   • Automated payout processing');
    console.log('   • Payment dispute resolution');
    console.log('   • Platform earnings tracking');
    console.log('   • Comprehensive reporting views');
    console.log('');
    console.log('🚀 Payment system ready for manual payments!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyPaymentSchema()
  .then(() => {
    console.log('🎉 Payment system schema migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Payment system schema migration failed:', error);
    process.exit(1);
  });
