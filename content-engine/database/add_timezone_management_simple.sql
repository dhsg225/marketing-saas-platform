-- Simple Timezone Management Migration
-- This adds timezone support without complex DO blocks

-- 1. Add timezone columns to content_ideas table
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok';
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS scheduled_at_utc TIMESTAMP WITH TIME ZONE;

-- 2. Add timezone columns to posts table (if it exists)
-- Note: This will fail silently if posts table doesn't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at_utc TIMESTAMP WITH TIME ZONE;

-- 3. Add timezone preferences to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone_preference VARCHAR(50) DEFAULT 'Asia/Bangkok';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone_source VARCHAR(20) DEFAULT 'system';

-- 4. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert default timezone settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
('system_default_timezone', 'Asia/Bangkok', 'string', 'Default timezone for the system', true),
('store_times_in', 'UTC', 'string', 'Storage format for all timestamps (always UTC)', false),
('display_timezone_fallback', 'Asia/Bangkok', 'string', 'Fallback timezone when user timezone is not set', true),
('timezone_aware_scheduling', 'true', 'boolean', 'Enable timezone-aware post scheduling', true),
('dst_auto_adjustment', 'true', 'boolean', 'Automatically adjust for daylight saving time', true)
ON CONFLICT (setting_key) DO NOTHING;
