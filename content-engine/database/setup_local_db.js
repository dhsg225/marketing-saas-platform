#!/usr/bin/env node

/**
 * Setup Local PostgreSQL Database for Marketing SaaS Platform
 * This script creates the local database and applies all schemas
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connect to PostgreSQL server (not specific database)
const adminPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres', // Connect to default postgres database
  user: 'postgres',
  password: 'password',
  ssl: false
});

// Connect to our application database
const appPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'marketing_saas',
  user: 'postgres',
  password: 'password',
  ssl: false
});

async function setupLocalDatabase() {
  const adminClient = await adminPool.connect();
  
  try {
    console.log('🚀 Setting up local PostgreSQL database...');
    
    // Create database if it doesn't exist
    console.log('📦 Creating marketing_saas database...');
    await adminClient.query('CREATE DATABASE marketing_saas');
    console.log('✅ Database created successfully!');
    
  } catch (error) {
    if (error.code === '42P04') {
      console.log('✅ Database already exists, continuing...');
    } else {
      console.error('❌ Error creating database:', error.message);
      throw error;
    }
  } finally {
    adminClient.release();
    await adminPool.end();
  }

  // Now connect to our application database
  const appClient = await appPool.connect();
  
  try {
    console.log('🔧 Setting up database schema...');
    
    // Enable UUID extension
    console.log('🔧 Enabling UUID extension...');
    await appClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    // Apply main schema
    console.log('📋 Applying main schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await appClient.query(schemaSQL);
    
    // Apply content ideas schema
    console.log('📋 Applying content ideas schema...');
    const contentIdeasPath = path.join(__dirname, 'content_ideas_schema.sql');
    const contentIdeasSQL = fs.readFileSync(contentIdeasPath, 'utf8');
    await appClient.query(contentIdeasSQL);
    
    // Apply document ingestion schema
    console.log('📋 Applying document ingestion schema...');
    const docIngestionPath = path.join(__dirname, 'document_ingestion_schema.sql');
    const docIngestionSQL = fs.readFileSync(docIngestionPath, 'utf8');
    await appClient.query(docIngestionSQL);
    
    console.log('✅ Local database setup complete!');
    console.log('');
    console.log('🎯 Database: marketing_saas');
    console.log('🎯 Host: localhost:5432');
    console.log('🎯 User: postgres');
    console.log('🎯 Password: password');
    console.log('');
    console.log('🚀 AI document reading system ready!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    throw error;
  } finally {
    appClient.release();
    await appPool.end();
  }
}

// Run the setup
setupLocalDatabase()
  .then(() => {
    console.log('🎉 Local database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
