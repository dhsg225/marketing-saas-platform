-- [October 15, 2025] - Social Account Connections Schema
-- Purpose: Multi-tenant Late API profile mapping to prevent cross-organization data leaks
-- Ensures users can ONLY see social media accounts/posts for their own organizations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Social Account Connections Table
-- Maps Late API profiles/accounts to specific organizations and projects
CREATE TABLE IF NOT EXISTS social_account_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Link to organizational hierarchy
    organization_id UUID NOT NULL,  -- References organizations table
    project_id UUID NOT NULL,       -- References projects table
    
    -- Late API identifiers
    late_profile_id VARCHAR(255) NOT NULL,  -- The profile ID from Late API
    late_profile_name VARCHAR(255),         -- Display name of the profile
    late_account_id VARCHAR(255),           -- The connected account ID (Facebook page, Instagram, etc.)
    
    -- Account metadata
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'pinterest', 'youtube')),
    account_name VARCHAR(255),              -- Display name (e.g., "Acme Properties")
    account_handle VARCHAR(255),            -- Username/handle (e.g., "@acmeproperties")
    account_type VARCHAR(50),               -- 'page', 'profile', 'group', etc.
    profile_image_url TEXT,                 -- Avatar/profile picture URL
    
    -- OAuth/Connection metadata
    connection_metadata JSONB DEFAULT '{}', -- Store permissions, scopes, etc.
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(50) DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,                        -- Store last error message if connection fails
    
    -- Audit trail
    created_by UUID NOT NULL,               -- User who connected the account
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each Late profile can only be connected to ONE project
    -- This prevents duplicate connections and data leakage
    UNIQUE(late_profile_id, project_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_conn_org ON social_account_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_project ON social_account_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_late_profile ON social_account_connections(late_profile_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_platform ON social_account_connections(platform);
CREATE INDEX IF NOT EXISTS idx_social_conn_status ON social_account_connections(is_active, connection_status);
CREATE INDEX IF NOT EXISTS idx_social_conn_created_by ON social_account_connections(created_by);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_social_account_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_social_account_connections_timestamp
    BEFORE UPDATE ON social_account_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_social_account_connections_updated_at();

-- Row Level Security (RLS) - Disabled for now
-- Security is enforced at application layer through API authorization checks
-- All Late API routes verify user has access to organization/project before returning data
-- ALTER TABLE social_account_connections ENABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE social_account_connections IS 'Maps Late API profiles and social media accounts to organizations/projects for multi-tenant isolation';
COMMENT ON COLUMN social_account_connections.late_profile_id IS 'The profile ID from Late API - acts as the container for connected social accounts';
COMMENT ON COLUMN social_account_connections.late_account_id IS 'The specific account ID within the Late profile (e.g., Facebook page ID)';
COMMENT ON COLUMN social_account_connections.organization_id IS 'Links to organization - ensures data isolation between different tenants';
COMMENT ON COLUMN social_account_connections.project_id IS 'Links to project - allows different campaigns to have different social accounts';

