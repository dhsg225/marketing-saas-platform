-- Enhanced Client Management Schema
-- This extends the existing schema with comprehensive client/account management

-- Client accounts table (extends organizations with detailed client info)
CREATE TABLE IF NOT EXISTS client_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL, -- Links to existing organization
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
    
    -- Account manager
    account_manager_id UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced projects table with client relationship
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_account_id UUID REFERENCES client_accounts(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Array of tags for categorization

-- Project team members (Many-to-Many)
CREATE TABLE IF NOT EXISTS project_team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'lead', 'member', 'contributor', 'reviewer')),
    permissions TEXT[], -- Array of specific permissions
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Project metrics and KPIs
CREATE TABLE IF NOT EXISTS project_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50), -- 'posts', 'views', 'engagement', 'leads', 'revenue'
    measurement_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client communication log
CREATE TABLE IF NOT EXISTS client_communications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Who initiated the communication
    communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN ('email', 'call', 'meeting', 'note', 'support')),
    subject VARCHAR(255),
    content TEXT,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'follow_up_required')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing and subscription management
CREATE TABLE IF NOT EXISTS client_billing (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    usage_amount DECIMAL(10,2) DEFAULT 0,
    additional_charges DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method VARCHAR(50),
    invoice_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking per client
CREATE TABLE IF NOT EXISTS client_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL, -- 'content_generation', 'api_calls', 'storage', 'bandwidth'
    usage_count INTEGER DEFAULT 0,
    usage_date DATE NOT NULL,
    cost_per_unit DECIMAL(10,4) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_accounts_organization ON client_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON client_accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_projects_client_account ON projects(client_account_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_project ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_project_date ON project_metrics(project_id, measurement_date);
CREATE INDEX IF NOT EXISTS idx_client_communications_account ON client_communications(client_account_id);
CREATE INDEX IF NOT EXISTS idx_client_billing_account_period ON client_billing(client_account_id, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_client_usage_account_date ON client_usage(client_account_id, usage_date);

-- RLS Policies for client data
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_usage ENABLE ROW LEVEL SECURITY;

-- Policies (simplified for now - would need proper role-based access in production)
CREATE POLICY "Users can view client accounts they have access to" ON client_accounts
    FOR SELECT USING (true);

CREATE POLICY "Users can view project team members for accessible projects" ON project_team_members
    FOR SELECT USING (true);

CREATE POLICY "Users can view project metrics for accessible projects" ON project_metrics
    FOR SELECT USING (true);

CREATE POLICY "Users can view communications for accessible clients" ON client_communications
    FOR SELECT USING (true);

CREATE POLICY "Users can view billing for accessible clients" ON client_billing
    FOR SELECT USING (true);

CREATE POLICY "Users can view usage for accessible clients" ON client_usage
    FOR SELECT USING (true);
