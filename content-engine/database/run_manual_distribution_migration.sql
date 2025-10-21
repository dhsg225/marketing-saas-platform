-- Manual Distribution Management Migration
-- Run this directly in your PostgreSQL database

-- Create manual_distribution_lists table
CREATE TABLE IF NOT EXISTS manual_distribution_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_platform VARCHAR(50) NOT NULL CHECK (target_platform IN (
        'facebook_groups', 'linkedin_groups', 'reddit', 'discord', 'telegram', 
        'whatsapp', 'email_lists', 'other'
    )),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distribution_target_groups table
CREATE TABLE IF NOT EXISTS distribution_target_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    distribution_list_id UUID NOT NULL REFERENCES manual_distribution_lists(id) ON DELETE CASCADE,
    group_name VARCHAR(255) NOT NULL,
    group_url VARCHAR(500),
    group_description TEXT,
    group_instructions TEXT,
    target_audience TEXT,
    posting_frequency VARCHAR(50) DEFAULT 'weekly' CHECK (posting_frequency IN (
        'daily', 'weekly', 'bi_weekly', 'monthly', 'as_needed'
    )),
    preferred_posting_days TEXT[],
    preferred_posting_times TEXT[],
    max_posts_per_day INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distribution_rotation_schedules table
CREATE TABLE IF NOT EXISTS distribution_rotation_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    distribution_list_id UUID NOT NULL REFERENCES manual_distribution_lists(id) ON DELETE CASCADE,
    schedule_name VARCHAR(255) NOT NULL,
    rotation_type VARCHAR(50) DEFAULT 'round_robin' CHECK (rotation_type IN (
        'round_robin', 'frequency_based', 'manual', 'random'
    )),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distribution_rotation_rules table
CREATE TABLE IF NOT EXISTS distribution_rotation_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rotation_schedule_id UUID NOT NULL REFERENCES distribution_rotation_schedules(id) ON DELETE CASCADE,
    target_group_id UUID NOT NULL REFERENCES distribution_target_groups(id) ON DELETE CASCADE,
    priority_order INTEGER DEFAULT 1,
    weight INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distribution_log table
CREATE TABLE IF NOT EXISTS distribution_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    distribution_list_id UUID NOT NULL REFERENCES manual_distribution_lists(id) ON DELETE CASCADE,
    target_group_id UUID NOT NULL REFERENCES distribution_target_groups(id) ON DELETE CASCADE,
    content_id UUID,
    content_title VARCHAR(500),
    content_summary TEXT,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    success BOOLEAN DEFAULT true,
    response_data JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_manual_distribution_lists_project_id ON manual_distribution_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_manual_distribution_lists_platform ON manual_distribution_lists(target_platform);
CREATE INDEX IF NOT EXISTS idx_manual_distribution_lists_active ON manual_distribution_lists(is_active);

CREATE INDEX IF NOT EXISTS idx_distribution_target_groups_list_id ON distribution_target_groups(distribution_list_id);
CREATE INDEX IF NOT EXISTS idx_distribution_target_groups_active ON distribution_target_groups(is_active);

CREATE INDEX IF NOT EXISTS idx_distribution_rotation_schedules_list_id ON distribution_rotation_schedules(distribution_list_id);
CREATE INDEX IF NOT EXISTS idx_distribution_rotation_schedules_active ON distribution_rotation_schedules(is_active);

CREATE INDEX IF NOT EXISTS idx_distribution_rotation_rules_schedule_id ON distribution_rotation_rules(rotation_schedule_id);
CREATE INDEX IF NOT EXISTS idx_distribution_rotation_rules_group_id ON distribution_rotation_rules(target_group_id);

CREATE INDEX IF NOT EXISTS idx_distribution_log_project_id ON distribution_log(project_id);
CREATE INDEX IF NOT EXISTS idx_distribution_log_list_id ON distribution_log(distribution_list_id);
CREATE INDEX IF NOT EXISTS idx_distribution_log_group_id ON distribution_log(target_group_id);
CREATE INDEX IF NOT EXISTS idx_distribution_log_shared_at ON distribution_log(shared_at);

-- Add comments
COMMENT ON TABLE manual_distribution_lists IS 'Lists of target groups for manual content distribution';
COMMENT ON TABLE distribution_target_groups IS 'Individual groups within a distribution list';
COMMENT ON TABLE distribution_rotation_schedules IS 'Scheduling rules for rotating content across target groups';
COMMENT ON TABLE distribution_rotation_rules IS 'Specific rules for each group within a rotation schedule';
COMMENT ON TABLE distribution_log IS 'Log of all manual content distributions for tracking and analytics';
