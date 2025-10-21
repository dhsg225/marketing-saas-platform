-- Timezone Management System Migration
-- This adds timezone support to the content management system

-- 1. Add timezone preferences to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'timezone_preference') THEN
        ALTER TABLE users ADD COLUMN timezone_preference VARCHAR(50) DEFAULT 'Asia/Bangkok';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'timezone_source') THEN
        ALTER TABLE users ADD COLUMN timezone_source VARCHAR(20) DEFAULT 'system';
    END IF;
END $$;

-- 2. Add timezone preferences to clients table  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'timezone_preference') THEN
        ALTER TABLE clients ADD COLUMN timezone_preference VARCHAR(50) DEFAULT 'Asia/Bangkok';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'timezone_source') THEN
        ALTER TABLE clients ADD COLUMN timezone_source VARCHAR(20) DEFAULT 'system';
    END IF;
END $$;

-- 3. Create system_settings table for global timezone configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'boolean', 'number', 'json'
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default timezone settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
('system_default_timezone', 'Asia/Bangkok', 'string', 'Default timezone for the system', true),
('store_times_in', 'UTC', 'string', 'Storage format for all timestamps (always UTC)', false),
('display_timezone_fallback', 'Asia/Bangkok', 'string', 'Fallback timezone when user timezone is not set', true),
('timezone_aware_scheduling', 'true', 'boolean', 'Enable timezone-aware post scheduling', true),
('dst_auto_adjustment', 'true', 'boolean', 'Automatically adjust for daylight saving time', true)
ON CONFLICT (setting_key) DO NOTHING;

-- 5. Add timezone tracking to content_ideas table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_ideas' AND column_name = 'scheduled_timezone') THEN
        ALTER TABLE content_ideas ADD COLUMN scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_ideas' AND column_name = 'scheduled_at_utc') THEN
        ALTER TABLE content_ideas ADD COLUMN scheduled_at_utc TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 6. Add timezone tracking to posts table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'scheduled_timezone') THEN
            ALTER TABLE posts ADD COLUMN scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'scheduled_at_utc') THEN
            ALTER TABLE posts ADD COLUMN scheduled_at_utc TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;

-- 7. Create timezone conversion log table for debugging
CREATE TABLE IF NOT EXISTS timezone_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    content_id UUID, -- Can reference content_ideas or posts
    content_type VARCHAR(20), -- 'content_idea' or 'post'
    original_time TIMESTAMP WITH TIME ZONE,
    original_timezone VARCHAR(50),
    converted_time TIMESTAMP WITH TIME ZONE,
    converted_timezone VARCHAR(50),
    conversion_direction VARCHAR(10), -- 'to_utc' or 'to_local'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create index for performance
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timezone_conversions_user_id') THEN
        CREATE INDEX idx_timezone_conversions_user_id ON timezone_conversions(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_timezone_conversions_content_id') THEN
        CREATE INDEX idx_timezone_conversions_content_id ON timezone_conversions(content_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_ideas_scheduled_at_utc') THEN
        CREATE INDEX idx_content_ideas_scheduled_at_utc ON content_ideas(scheduled_at_utc);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_timezone_preference') THEN
        CREATE INDEX idx_users_timezone_preference ON users(timezone_preference);
    END IF;
END $$;

-- 9. Add comments for documentation
DO $$ 
BEGIN
    COMMENT ON TABLE system_settings IS 'Global system configuration including timezone settings';
    COMMENT ON TABLE timezone_conversions IS 'Log of timezone conversions for debugging and audit purposes';
    COMMENT ON COLUMN users.timezone_preference IS 'User preferred timezone (IANA format)';
    COMMENT ON COLUMN users.timezone_source IS 'Source of timezone setting: system or custom';
    COMMENT ON COLUMN content_ideas.scheduled_timezone IS 'Timezone used when scheduling this content';
    COMMENT ON COLUMN content_ideas.scheduled_at_utc IS 'UTC timestamp for scheduled date/time';
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore comment errors
        NULL;
END $$;
