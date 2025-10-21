const { query } = require('../database/config');

async function applyTimezoneMigration() {
  try {
    console.log('🕐 Starting timezone migration...');
    
    // Add timezone columns to content_ideas table
    console.log('Adding timezone columns to content_ideas...');
    await query(`
      ALTER TABLE content_ideas 
      ADD COLUMN IF NOT EXISTS scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
      ADD COLUMN IF NOT EXISTS scheduled_at_utc TIMESTAMP WITH TIME ZONE
    `);
    
    // Add timezone columns to posts table if it exists
    console.log('Adding timezone columns to posts...');
    await query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
          ALTER TABLE posts 
          ADD COLUMN IF NOT EXISTS scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
          ADD COLUMN IF NOT EXISTS scheduled_at_utc TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);
    
    // Add timezone preferences to users table
    console.log('Adding timezone preferences to users...');
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS timezone_preference VARCHAR(50) DEFAULT 'Asia/Bangkok',
      ADD COLUMN IF NOT EXISTS timezone_source VARCHAR(20) DEFAULT 'system'
    `);
    
    // Create system_settings table
    console.log('Creating system_settings table...');
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(20) DEFAULT 'string',
        description TEXT,
        is_editable BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Insert default timezone settings
    console.log('Inserting default timezone settings...');
    await query(`
      INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
      ('system_default_timezone', 'Asia/Bangkok', 'string', 'Default timezone for the system', true),
      ('store_times_in', 'UTC', 'string', 'Storage format for all timestamps (always UTC)', false),
      ('display_timezone_fallback', 'Asia/Bangkok', 'string', 'Fallback timezone when user timezone is not set', true),
      ('timezone_aware_scheduling', 'true', 'boolean', 'Enable timezone-aware post scheduling', true),
      ('dst_auto_adjustment', 'true', 'boolean', 'Automatically adjust for daylight saving time', true)
      ON CONFLICT (setting_key) DO NOTHING
    `);
    
    console.log('✅ Timezone migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Timezone migration failed:', error.message);
    process.exit(1);
  }
}

applyTimezoneMigration();
