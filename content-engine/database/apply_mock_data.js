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

async function applyMockData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting mock data seeding...');
    
    // Read and execute the mock data SQL file
    const mockDataPath = path.join(__dirname, 'seed_basic_profiles.sql');
    const mockDataSQL = fs.readFileSync(mockDataPath, 'utf8');
    
    console.log('📊 Executing mock data SQL...');
    await client.query(mockDataSQL);
    
    console.log('✅ Mock data successfully applied!');
    console.log('');
    console.log('🎯 Added mock data:');
    console.log('   • 5 talent profiles with diverse specializations');
    console.log('   • 9 portfolio items with sample media');
    console.log('   • 9 service packages with realistic pricing');
    console.log('   • 7 reviews with ratings and feedback');
    console.log('   • 5 booking examples (active and completed)');
    console.log('   • 4 message conversations');
    console.log('   • 7 availability slots');
    console.log('');
    console.log('🚀 Visit http://localhost:5002/talent to see the mock data!');
    
  } catch (error) {
    console.error('❌ Error applying mock data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMockData()
  .then(() => {
    console.log('🎉 Mock data seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Mock data seeding failed:', error);
    process.exit(1);
  });
