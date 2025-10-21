-- CORRECTED HIERARCHY SCHEMA
-- This fixes the hierarchy to match the intended business model

-- 1. ORGANIZATIONS (Your Agency/SaaS Company)
-- This represents YOUR agency or the SaaS platform itself
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- "Productionhouse Asia", "Marketing Solutions Inc"
    description TEXT,
    organization_type VARCHAR(50) DEFAULT 'agency' CHECK (organization_type IN ('agency', 'enterprise', 'platform')),
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USERS (Your Team Members)
-- These are YOUR employees/team members who work on client projects
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'content_creator', 'analyst', 'viewer')),
    department VARCHAR(100), -- 'content', 'design', 'analytics', 'account_management'
    phone VARCHAR(50),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER-ORGANIZATION RELATIONSHIPS (Many-to-Many)
-- Your team members can work across different organizations (if you have multiple agencies)
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
    permissions TEXT[], -- Array of specific permissions
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 4. CLIENTS (Your Customers)
-- These are the businesses that pay you for marketing services
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Which of your organizations manages this client
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(50) NOT NULL CHECK (industry IN ('restaurant', 'property', 'agency', 'retail', 'healthcare', 'education', 'other')),
    business_type VARCHAR(100), -- 'franchise', 'chain', 'independent', 'corporate'
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Business details
    annual_revenue DECIMAL(15,2),
    employee_count INTEGER,
    established_year INTEGER,
    business_description TEXT,
    
    -- Account status
    account_status VARCHAR(50) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'cancelled', 'trial')),
    subscription_tier VARCHAR(50) DEFAULT 'basic' CHECK (subscription_tier IN ('trial', 'basic', 'professional', 'enterprise')),
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'annually')),
    
    -- Key contacts
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    primary_contact_role VARCHAR(100),
    
    -- Account manager (your team member responsible for this client)
    account_manager_id UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PROJECTS (Client Campaigns/Websites)
-- Each client can have multiple projects (campaigns, websites, etc.)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Links to the client
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Which organization manages this
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) DEFAULT 'campaign' CHECK (project_type IN ('campaign', 'website', 'social_media', 'email_marketing', 'seo', 'ppc', 'content_creation')),
    industry VARCHAR(50) NOT NULL CHECK (industry IN ('restaurant', 'property', 'agency', 'retail', 'healthcare', 'education', 'other')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'completed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Project details
    budget DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    project_manager_id UUID REFERENCES users(id), -- Your team member managing this project
    
    -- Project settings
    tags TEXT[], -- Array of tags for categorization
    settings JSONB, -- Flexible project-specific settings
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PROJECT TEAM MEMBERS (Many-to-Many)
-- Which of your team members work on which projects
CREATE TABLE IF NOT EXISTS project_team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'lead', 'member', 'contributor', 'reviewer')),
    permissions TEXT[], -- Array of specific permissions
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 7. CONTENT PIECES (Generated Content)
-- Content generated for specific projects
CREATE TABLE IF NOT EXISTS content_pieces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who generated this content
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('blog', 'social', 'email', 'ads')),
    industry VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'social_media_post', 'blog_post', 'email_campaign', etc.
    topic VARCHAR(255),
    tone VARCHAR(50),
    length VARCHAR(50),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(account_status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_team_members_project ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_user ON project_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_project ON content_pieces(project_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_user ON content_pieces(user_id);

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;

-- Basic policies (would need proper role-based access in production)
CREATE POLICY "Users can view their organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can view organizations they belong to" ON user_organizations FOR SELECT USING (true);
CREATE POLICY "Users can view clients in their organizations" ON clients FOR SELECT USING (true);
CREATE POLICY "Users can view projects for accessible clients" ON projects FOR SELECT USING (true);
CREATE POLICY "Users can view team members for accessible projects" ON project_team_members FOR SELECT USING (true);
CREATE POLICY "Users can view content for accessible projects" ON content_pieces FOR SELECT USING (true);
