-- Supabase Migration Script for Marketing SaaS Platform
-- This script migrates the existing PostgreSQL schema to Supabase with RLS

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with RLS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    industry_preference VARCHAR(100),
    timezone_preference VARCHAR(50) DEFAULT 'Asia/Bangkok',
    timezone_source VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table with RLS
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create clients table with RLS
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    account_status VARCHAR(50) DEFAULT 'active',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    project_count INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table with RLS
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    project_type VARCHAR(50) DEFAULT 'content',
    priority VARCHAR(20) DEFAULT 'medium',
    budget DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_ideas table with RLS
CREATE TABLE IF NOT EXISTS content_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'medium',
    suggested_date DATE,
    suggested_time TIME,
    scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    scheduled_at_utc TIMESTAMP WITH TIME ZONE,
    topic_keywords TEXT[],
    post_type_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table with RLS
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT,
    full_content TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    creation_mode VARCHAR(50) DEFAULT 'by_parts',
    scheduled_date DATE,
    scheduled_time TIME,
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    platform VARCHAR(50) DEFAULT 'instagram',
    auto_publish BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    attached_asset_id UUID,
    attached_asset_url TEXT,
    scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    scheduled_at_utc TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_types table
CREATE TABLE IF NOT EXISTS post_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default post types
INSERT INTO post_types (name, color) VALUES 
('Instagram Post', '#E4405F'),
('Facebook Post', '#1877F2'),
('Twitter Post', '#1DA1F2'),
('LinkedIn Post', '#0077B5'),
('TikTok Video', '#000000'),
('Blog Post', '#FF6B6B'),
('Email Newsletter', '#4ECDC4')
ON CONFLICT DO NOTHING;

-- Update content_ideas to reference post_types
ALTER TABLE content_ideas 
ADD CONSTRAINT fk_content_ideas_post_type 
FOREIGN KEY (post_type_id) REFERENCES post_types(id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR ALL USING (auth.uid() = id);

-- Organizations: users can only see organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
    FOR ALL USING (
        id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- User-Organization relationships
CREATE POLICY "Users can view their organization relationships" ON user_organizations
    FOR ALL USING (user_id = auth.uid());

-- Clients: users can only see clients from their organizations
CREATE POLICY "Users can view clients from their organizations" ON clients
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Projects: users can only see projects from their organizations
CREATE POLICY "Users can view projects from their organizations" ON projects
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Content Ideas: users can only see content from their organization's projects
CREATE POLICY "Users can view content ideas from their projects" ON content_ideas
    FOR ALL USING (
        project_id IN (
            SELECT p.id 
            FROM projects p
            JOIN user_organizations uo ON p.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Posts: users can only see posts from their organization's projects
CREATE POLICY "Users can view posts from their projects" ON posts
    FOR ALL USING (
        project_id IN (
            SELECT p.id 
            FROM projects p
            JOIN user_organizations uo ON p.organization_id = uo.organization_id
            WHERE uo.user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_project_id ON content_ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_posts_project_id ON posts(project_id);
CREATE INDEX IF NOT EXISTS idx_posts_concept_id ON posts(concept_id);

-- Create a function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
