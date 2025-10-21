-- Add Content Playbook Module tables to existing database

-- User-Organization relationship table (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL, -- References the Organization in the hierarchy
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'member', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table (extends the hierarchy model)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL, -- References the Organization in the hierarchy
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(50) NOT NULL CHECK (industry IN ('restaurant', 'property', 'agency')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project hashtag management
CREATE TABLE IF NOT EXISTS project_hashtags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    hashtag VARCHAR(100) NOT NULL,
    is_favorite BOOLEAN DEFAULT false, -- true for mandatory brand hashtags
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content recipes (Post Type Schedules)
CREATE TABLE IF NOT EXISTS content_recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Restaurant Ingredient Spotlight"
    description TEXT,
    purpose TEXT NOT NULL,
    target_audience TEXT,
    required_asset_type VARCHAR(50) CHECK (required_asset_type IN ('image', 'video', 'text', 'mixed')),
    tone VARCHAR(50) NOT NULL,
    suggested_frequency VARCHAR(50), -- e.g., "weekly", "bi-weekly", "monthly"
    ai_instructions TEXT NOT NULL, -- Core prompt instructions for AI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel formatting templates
CREATE TABLE IF NOT EXISTS channel_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('facebook', 'instagram', 'linkedin', 'twitter', 'tiktok')),
    template_name VARCHAR(255) NOT NULL,
    formatting_rules JSONB NOT NULL, -- Stores specific formatting rules for the channel
    example_output TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content generation with playbook adherence
CREATE TABLE IF NOT EXISTS content_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    content_recipe_id UUID REFERENCES content_recipes(id) ON DELETE SET NULL,
    channel_template_id UUID REFERENCES channel_templates(id) ON DELETE SET NULL,
    generated_content TEXT NOT NULL,
    applied_hashtags TEXT[], -- Array of hashtags used
    formatting_applied JSONB, -- Records which formatting rules were applied
    ai_metadata JSONB, -- Stores AI generation metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_role ON user_organizations(role);

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_industry ON projects(industry);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_project_hashtags_project_id ON project_hashtags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_hashtags_is_favorite ON project_hashtags(is_favorite);

CREATE INDEX IF NOT EXISTS idx_content_recipes_project_id ON content_recipes(project_id);
CREATE INDEX IF NOT EXISTS idx_content_recipes_is_active ON content_recipes(is_active);

CREATE INDEX IF NOT EXISTS idx_channel_templates_project_id ON channel_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_channel_templates_channel ON channel_templates(channel);
CREATE INDEX IF NOT EXISTS idx_channel_templates_is_default ON channel_templates(is_default);

CREATE INDEX IF NOT EXISTS idx_content_generations_project_id ON content_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_recipe_id ON content_generations(content_recipe_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_template_id ON content_generations(channel_template_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_created_at ON content_generations(created_at);

-- Enable RLS for new tables
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generations ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for new tables
CREATE POLICY IF NOT EXISTS "Users can view their organization memberships" ON user_organizations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can create organization memberships" ON user_organizations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Projects policies (users can access projects from their organizations)
CREATE POLICY IF NOT EXISTS "Users can view projects from their organizations" ON projects
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can create projects in their organizations" ON projects
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can update projects in their organizations" ON projects
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Project hashtags policies
CREATE POLICY IF NOT EXISTS "Users can manage hashtags for their projects" ON project_hashtags
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN user_organizations uo ON p.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Content recipes policies
CREATE POLICY IF NOT EXISTS "Users can manage recipes for their projects" ON content_recipes
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN user_organizations uo ON p.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Channel templates policies
CREATE POLICY IF NOT EXISTS "Users can manage templates for their projects" ON channel_templates
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN user_organizations uo ON p.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Content generations policies
CREATE POLICY IF NOT EXISTS "Users can view generations for their projects" ON content_generations
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN user_organizations uo ON p.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can create generations for their projects" ON content_generations
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN user_organizations uo ON p.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_content_recipes_updated_at BEFORE UPDATE ON content_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_channel_templates_updated_at BEFORE UPDATE ON channel_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
