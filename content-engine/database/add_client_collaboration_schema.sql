-- Client Collaboration Portal Database Schema
-- Feature 8: Client Collaboration Portal Implementation

-- =====================================================
-- CLIENT ACCESS MANAGEMENT
-- =====================================================

-- Client portal users (separate from internal users)
CREATE TABLE IF NOT EXISTS client_portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- viewer, approver, collaborator
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, email)
);

-- Client access permissions per project
CREATE TABLE IF NOT EXISTS client_project_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_portal_user_id UUID NOT NULL REFERENCES client_portal_users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL DEFAULT 'view', -- view, comment, approve, collaborate
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(client_portal_user_id, project_id)
);

-- =====================================================
-- APPROVAL WORKFLOWS
-- =====================================================

-- Content approval workflows
CREATE TABLE IF NOT EXISTS content_approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(50) NOT NULL DEFAULT 'content', -- content, campaign, asset
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Approval workflow steps
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES content_approval_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- client_approval, internal_review, auto_approve
    approver_type VARCHAR(50) NOT NULL, -- client_user, internal_user, role
    approver_id UUID, -- Can reference client_portal_users or users
    approver_role VARCHAR(100), -- For role-based approval
    is_required BOOLEAN DEFAULT true,
    auto_approve_after_hours INTEGER, -- Auto-approve after X hours if no response
    created_at TIMESTAMP DEFAULT NOW()
);

-- Content approval requests
CREATE TABLE IF NOT EXISTS content_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES content_approval_workflows(id),
    content_type VARCHAR(50) NOT NULL, -- post, campaign, asset, idea
    content_id UUID NOT NULL, -- References the actual content
    content_title VARCHAR(255) NOT NULL,
    content_preview TEXT,
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, expired
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    expires_at TIMESTAMP
);

-- Approval request steps (tracking progress through workflow)
CREATE TABLE IF NOT EXISTS approval_request_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID NOT NULL REFERENCES content_approval_requests(id) ON DELETE CASCADE,
    workflow_step_id UUID NOT NULL REFERENCES approval_workflow_steps(id),
    step_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, skipped
    approver_id UUID, -- client_portal_user_id or user_id
    approver_type VARCHAR(50), -- client_user, internal_user
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    comments TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- FEEDBACK SYSTEMS
-- =====================================================

-- Client feedback on content
CREATE TABLE IF NOT EXISTS client_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID REFERENCES content_approval_requests(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    client_portal_user_id UUID NOT NULL REFERENCES client_portal_users(id),
    feedback_type VARCHAR(50) NOT NULL, -- comment, suggestion, concern, approval
    feedback_text TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false, -- visible to other client users
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Feedback threads (for ongoing discussions)
CREATE TABLE IF NOT EXISTS feedback_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES client_feedback(id) ON DELETE CASCADE,
    author_id UUID NOT NULL, -- Can be client_portal_user_id or user_id
    author_type VARCHAR(50) NOT NULL, -- client_user, internal_user
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- internal team only
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- COLLABORATION TOOLS
-- =====================================================

-- Client collaboration sessions
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_name VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) NOT NULL, -- content_review, strategy_discussion, campaign_planning
    host_user_id UUID NOT NULL REFERENCES users(id),
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    meeting_link VARCHAR(500),
    meeting_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Session participants
CREATE TABLE IF NOT EXISTS collaboration_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL, -- Can be client_portal_user_id or user_id
    participant_type VARCHAR(50) NOT NULL, -- client_user, internal_user
    role VARCHAR(50) DEFAULT 'participant', -- host, participant, observer
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shared documents and assets
CREATE TABLE IF NOT EXISTS shared_client_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- document, image, video, link
    asset_name VARCHAR(255) NOT NULL,
    asset_path VARCHAR(500),
    asset_url VARCHAR(500),
    description TEXT,
    shared_by UUID NOT NULL REFERENCES users(id),
    shared_at TIMESTAMP DEFAULT NOW(),
    is_public BOOLEAN DEFAULT false, -- visible to all client users
    access_level VARCHAR(50) DEFAULT 'view', -- view, download, edit
    expires_at TIMESTAMP
);

-- Asset access permissions
CREATE TABLE IF NOT EXISTS shared_asset_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES shared_client_assets(id) ON DELETE CASCADE,
    client_portal_user_id UUID REFERENCES client_portal_users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL, -- view, download, edit
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(asset_id, client_portal_user_id)
);

-- =====================================================
-- CALENDAR ACCESS
-- =====================================================

-- Client calendar views
CREATE TABLE IF NOT EXISTS client_calendar_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    client_portal_user_id UUID NOT NULL REFERENCES client_portal_users(id) ON DELETE CASCADE,
    view_type VARCHAR(50) NOT NULL, -- content_calendar, campaign_calendar, approval_calendar
    view_settings JSONB, -- Custom view preferences
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

-- Client notifications
CREATE TABLE IF NOT EXISTS client_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_portal_user_id UUID NOT NULL REFERENCES client_portal_users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- approval_request, feedback, session_invite, content_update
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(50), -- approval_request, feedback, session, etc.
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Client portal users indexes
CREATE INDEX IF NOT EXISTS idx_client_portal_users_client_id ON client_portal_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_email ON client_portal_users(email);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_active ON client_portal_users(is_active);

-- Client project access indexes
CREATE INDEX IF NOT EXISTS idx_client_project_access_user_id ON client_project_access(client_portal_user_id);
CREATE INDEX IF NOT EXISTS idx_client_project_access_project_id ON client_project_access(project_id);
CREATE INDEX IF NOT EXISTS idx_client_project_access_active ON client_project_access(is_active);

-- Approval workflow indexes
CREATE INDEX IF NOT EXISTS idx_approval_workflows_project_id ON content_approval_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_active ON content_approval_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_steps_workflow_id ON approval_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_steps_order ON approval_workflow_steps(workflow_id, step_order);

-- Approval request indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_project_id ON content_approval_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON content_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON content_approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_request_steps_request_id ON approval_request_steps(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_steps_status ON approval_request_steps(step_status);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_client_feedback_project_id ON client_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_client_user_id ON client_feedback(client_portal_user_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_type ON client_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_threads_feedback_id ON feedback_threads(feedback_id);

-- Collaboration indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_project_id ON collaboration_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_status ON collaboration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_session_participants_session_id ON collaboration_session_participants(session_id);

-- Shared assets indexes
CREATE INDEX IF NOT EXISTS idx_shared_client_assets_project_id ON shared_client_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_shared_client_assets_type ON shared_client_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_shared_asset_access_asset_id ON shared_asset_access(asset_id);

-- Calendar indexes
CREATE INDEX IF NOT EXISTS idx_client_calendar_views_project_id ON client_calendar_views(project_id);
CREATE INDEX IF NOT EXISTS idx_client_calendar_views_user_id ON client_calendar_views(client_portal_user_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_client_notifications_user_id ON client_notifications(client_portal_user_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_read ON client_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_client_notifications_type ON client_notifications(notification_type);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_request_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_client_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_asset_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_calendar_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Client portal users policies
CREATE POLICY "Users can view client portal users for their organization" ON client_portal_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE c.id = client_portal_users.client_id AND uo.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage client portal users for their organization" ON client_portal_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM clients c
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE c.id = client_portal_users.client_id AND uo.user_id = current_user_id()
        )
    );

-- Client project access policies
CREATE POLICY "Users can view client project access for their organization" ON client_project_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = client_project_access.project_id AND uo.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage client project access for their organization" ON client_project_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = client_project_access.project_id AND uo.user_id = current_user_id()
        )
    );

-- Approval workflow policies
CREATE POLICY "Users can view approval workflows for their projects" ON content_approval_workflows
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = content_approval_workflows.project_id AND uo.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage approval workflows for their projects" ON content_approval_workflows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = content_approval_workflows.project_id AND uo.user_id = current_user_id()
        )
    );

-- Content approval request policies
CREATE POLICY "Users can view approval requests for their projects" ON content_approval_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = content_approval_requests.project_id AND uo.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage approval requests for their projects" ON content_approval_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = content_approval_requests.project_id AND uo.user_id = current_user_id()
        )
    );

-- Client feedback policies
CREATE POLICY "Users can view client feedback for their projects" ON client_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = client_feedback.project_id AND uo.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage client feedback for their projects" ON client_feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = client_feedback.project_id AND uo.user_id = current_user_id()
        )
    );

-- Collaboration session policies
CREATE POLICY "Users can view collaboration sessions for their projects" ON collaboration_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = collaboration_sessions.project_id AND uo.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage collaboration sessions for their projects" ON collaboration_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = collaboration_sessions.project_id AND uo.user_id = current_user_id()
        )
    );

-- Shared assets policies
CREATE POLICY "Users can view shared assets for their projects" ON shared_client_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = shared_client_assets.project_id AND uo.user_id = current_user_id()
        )
    );

CREATE POLICY "Users can manage shared assets for their projects" ON shared_client_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN user_organizations uo ON c.organization_id = uo.organization_id
            WHERE p.id = shared_client_assets.project_id AND uo.user_id = current_user_id()
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE client_portal_users IS 'Client users who can access the collaboration portal';
COMMENT ON TABLE client_project_access IS 'Permissions for client users to access specific projects';
COMMENT ON TABLE content_approval_workflows IS 'Approval workflows for content, campaigns, and assets';
COMMENT ON TABLE approval_workflow_steps IS 'Individual steps within approval workflows';
COMMENT ON TABLE content_approval_requests IS 'Requests for content approval following workflows';
COMMENT ON TABLE approval_request_steps IS 'Progress tracking through approval workflow steps';
COMMENT ON TABLE client_feedback IS 'Feedback from client users on content and projects';
COMMENT ON TABLE feedback_threads IS 'Discussion threads on feedback items';
COMMENT ON TABLE collaboration_sessions IS 'Scheduled collaboration sessions with clients';
COMMENT ON TABLE collaboration_session_participants IS 'Participants in collaboration sessions';
COMMENT ON TABLE shared_client_assets IS 'Assets shared with client users';
COMMENT ON TABLE shared_asset_access IS 'Access permissions for shared assets';
COMMENT ON TABLE client_calendar_views IS 'Calendar view preferences for client users';
COMMENT ON TABLE client_notifications IS 'Notifications sent to client portal users';
