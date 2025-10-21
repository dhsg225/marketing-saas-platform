#!/usr/bin/env node

/**
 * Setup SQLite Database for Marketing SaaS Platform
 * This script creates all necessary tables for the application
 */

const { query } = require('./config');

async function setupSQLiteDatabase() {
  try {
    console.log('🚀 Setting up SQLite database...');
    
    // Create users table
    console.log('📋 Creating users table...');
    await query('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, industry_preference TEXT, created_at TEXT)');
    
    // Create organizations table
    console.log('📋 Creating organizations table...');
    await query('CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, created_at TEXT)');
    
    // Create user_organizations table
    console.log('📋 Creating user_organizations table...');
    await query('CREATE TABLE IF NOT EXISTS user_organizations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, organization_id TEXT NOT NULL, role TEXT DEFAULT "member", created_at TEXT)');
    
    // Create clients table
    console.log('📋 Creating clients table...');
    await query('CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT, phone TEXT, created_at TEXT)');
    
    // Create projects table
    console.log('📋 Creating projects table...');
    await query('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, organization_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, created_at TEXT)');
    
    // Create content_ideas table (already exists)
    console.log('📋 Content ideas table already exists...');
    
    // Insert test user
    console.log('👤 Creating test user...');
    await query(`
      INSERT OR IGNORE INTO users (id, email, password_hash, name, industry_preference)
      VALUES ('test-user-1', 'test@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User', 'restaurant')
    `);
    
    // Insert test organization
    console.log('🏢 Creating test organization...');
    await query(`
      INSERT OR IGNORE INTO organizations (id, name, description)
      VALUES ('test-org-1', 'Test Organization', 'Test organization for development')
    `);
    
    // Insert test user_organization
    console.log('🔗 Linking user to organization...');
    await query(`
      INSERT OR IGNORE INTO user_organizations (id, user_id, organization_id, role)
      VALUES ('test-uo-1', 'test-user-1', 'test-org-1', 'admin')
    `);
    
    // Insert test client
    console.log('👥 Creating test client...');
    await query(`
      INSERT OR IGNORE INTO clients (id, organization_id, name, email)
      VALUES ('test-client-1', 'test-org-1', 'Test Client', 'client@test.com')
    `);
    
    // Insert test project
    console.log('📁 Creating test project...');
    await query(`
      INSERT OR IGNORE INTO projects (id, client_id, organization_id, name, description)
      VALUES ('test-project-1', 'test-client-1', 'test-org-1', 'Test Project', 'Test project for development')
    `);
    
    console.log('✅ SQLite database setup complete!');
    console.log('');
    console.log('🎯 Test credentials:');
    console.log('   Email: test@test.com');
    console.log('   Password: password123');
    console.log('');
    console.log('🚀 AI document reading system ready!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    throw error;
  }
}

// Run the setup
setupSQLiteDatabase()
  .then(() => {
    console.log('🎉 Database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
