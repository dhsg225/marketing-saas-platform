-- Add Manual Distribution Management Tables
-- Feature 4: Manual Distribution Management Module

-- Create manual_distribution_lists table
CREATE TABLE manual_distribution_lists (
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

-- Create distribution_target_groups table (individual groups within a list)
CREATE TABLE distribution_target_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    distribution_list_id UUID NOT NULL REFERENCES manual_distribution_lists(id) ON DELETE CASCADE,
    group_name VARCHAR(255) NOT NULL,
    group_url VARCHAR(500),
    group_description TEXT,
    group_instructions TEXT, -- Specific instructions for this group
    target_audience TEXT, -- Who this group is for
    posting_frequency VARCHAR(50) DEFAULT 'weekly' CHECK (posting_frequency IN (
        'daily', 'weekly', 'bi_weekly', 'monthly', 'as_needed'
    )),
    preferred_posting_days TEXT[], -- Array of days: ['monday', 'wednesday', 'friday']
    preferred_posting_times TEXT[], -- Array of times: ['09:00', '14:00', '18:00']
    max_posts_per_day INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distribution_rotation_schedules table
CREATE TABLE distribution_rotation_schedules (
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

-- Create distribution_rotation_rules table (specific rules for each group in a schedule)
CREATE TABLE distribution_rotation_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rotation_schedule_id UUID NOT NULL REFERENCES distribution_rotation_schedules(id) ON DELETE CASCADE,
    target_group_id UUID NOT NULL REFERENCES distribution_target_groups(id) ON DELETE CASCADE,
    priority_order INTEGER DEFAULT 1,
    weight INTEGER DEFAULT 1, -- For frequency-based rotation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create distribution_log table (track what was shared where and when)
CREATE TABLE distribution_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    distribution_list_id UUID NOT NULL REFERENCES manual_distribution_lists(id) ON DELETE CASCADE,
    target_group_id UUID NOT NULL REFERENCES distribution_target_groups(id) ON DELETE CASCADE,
    content_id UUID, -- Reference to content_ideas or other content
    content_title VARCHAR(500),
    content_summary TEXT,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- Any notes about the sharing
    success BOOLEAN DEFAULT true,
    response_data JSONB -- Store any response data from the platform
);

-- Create indexes for better performance
CREATE INDEX idx_manual_distribution_lists_project_id ON manual_distribution_lists(project_id);
CREATE INDEX idx_manual_distribution_lists_platform ON manual_distribution_lists(target_platform);
CREATE INDEX idx_manual_distribution_lists_active ON manual_distribution_lists(is_active);

CREATE INDEX idx_distribution_target_groups_list_id ON distribution_target_groups(distribution_list_id);
CREATE INDEX idx_distribution_target_groups_active ON distribution_target_groups(is_active);
CREATE INDEX idx_distribution_target_groups_frequency ON distribution_target_groups(posting_frequency);

CREATE INDEX idx_distribution_rotation_schedules_list_id ON distribution_rotation_schedules(distribution_list_id);
CREATE INDEX idx_distribution_rotation_schedules_active ON distribution_rotation_schedules(is_active);

CREATE INDEX idx_distribution_rotation_rules_schedule_id ON distribution_rotation_rules(rotation_schedule_id);
CREATE INDEX idx_distribution_rotation_rules_group_id ON distribution_rotation_rules(target_group_id);
CREATE INDEX idx_distribution_rotation_rules_active ON distribution_rotation_rules(is_active);

CREATE INDEX idx_distribution_log_project_id ON distribution_log(project_id);
CREATE INDEX idx_distribution_log_list_id ON distribution_log(distribution_list_id);
CREATE INDEX idx_distribution_log_group_id ON distribution_log(target_group_id);
CREATE INDEX idx_distribution_log_shared_at ON distribution_log(shared_at);
CREATE INDEX idx_distribution_log_shared_by ON distribution_log(shared_by);

-- Add RLS (Row Level Security) policies
ALTER TABLE manual_distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_target_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_rotation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_rotation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view distribution lists for projects they have access to
CREATE POLICY "Users can view distribution lists for their projects" ON manual_distribution_lists
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can insert distribution lists for projects they have access to
CREATE POLICY "Users can insert distribution lists for their projects" ON manual_distribution_lists
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        ) AND created_by = auth.uid()
    );

-- Policy: Users can update distribution lists they created
CREATE POLICY "Users can update distribution lists they created" ON manual_distribution_lists
    FOR UPDATE USING (
        created_by = auth.uid() AND
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can delete distribution lists they created
CREATE POLICY "Users can delete distribution lists they created" ON manual_distribution_lists
    FOR DELETE USING (
        created_by = auth.uid() AND
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Similar policies for other tables (simplified for brevity)
CREATE POLICY "Users can manage target groups for their distribution lists" ON distribution_target_groups
    FOR ALL USING (
        distribution_list_id IN (
            SELECT mdl.id FROM manual_distribution_lists mdl
            JOIN projects p ON mdl.project_id = p.id
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage rotation schedules for their distribution lists" ON distribution_rotation_schedules
    FOR ALL USING (
        distribution_list_id IN (
            SELECT mdl.id FROM manual_distribution_lists mdl
            JOIN projects p ON mdl.project_id = p.id
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        ) AND created_by = auth.uid()
    );

CREATE POLICY "Users can manage rotation rules for their schedules" ON distribution_rotation_rules
    FOR ALL USING (
        rotation_schedule_id IN (
            SELECT drs.id FROM distribution_rotation_schedules drs
            JOIN manual_distribution_lists mdl ON drs.distribution_list_id = mdl.id
            JOIN projects p ON mdl.project_id = p.id
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view distribution logs for their projects" ON distribution_log
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert distribution logs for their projects" ON distribution_log
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        ) AND shared_by = auth.uid()
    );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_manual_distribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_manual_distribution_lists_updated_at
    BEFORE UPDATE ON manual_distribution_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_distribution_updated_at();

CREATE TRIGGER trigger_update_distribution_target_groups_updated_at
    BEFORE UPDATE ON distribution_target_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_distribution_updated_at();

CREATE TRIGGER trigger_update_distribution_rotation_schedules_updated_at
    BEFORE UPDATE ON distribution_rotation_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_distribution_updated_at();

-- Add comments for documentation
COMMENT ON TABLE manual_distribution_lists IS 'Lists of target groups for manual content distribution';
COMMENT ON TABLE distribution_target_groups IS 'Individual groups within a distribution list (Facebook groups, LinkedIn groups, etc.)';
COMMENT ON TABLE distribution_rotation_schedules IS 'Scheduling rules for rotating content across target groups';
COMMENT ON TABLE distribution_rotation_rules IS 'Specific rules for each group within a rotation schedule';
COMMENT ON TABLE distribution_log IS 'Log of all manual content distributions for tracking and analytics';
