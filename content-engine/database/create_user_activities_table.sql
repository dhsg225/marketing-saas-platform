-- Create user_activities table to track user actions
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'generate_content', 'upload_document', 'schedule_post', 'view_analytics', etc.
    action_description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_action_type ON user_activities(action_type);

-- Insert some sample activities for testing
INSERT INTO user_activities (user_id, project_id, action_type, action_description, metadata) VALUES
((SELECT id FROM users LIMIT 1), NULL, 'generate_content', 'Generated content ideas for social media campaign', '{"content_count": 5, "platform": "Instagram"}'),
((SELECT id FROM users LIMIT 1), NULL, 'upload_document', 'Uploaded and processed client reference document', '{"document_type": "Content Calendar", "ai_processed": true}'),
((SELECT id FROM users LIMIT 1), NULL, 'view_analytics', 'Viewed content performance analytics', '{"date_range": "last_30_days"}'),
((SELECT id FROM users LIMIT 1), NULL, 'schedule_post', 'Scheduled Instagram post for tomorrow', '{"platform": "Instagram", "scheduled_date": "2024-10-18"}'),
((SELECT id FROM users LIMIT 1), NULL, 'manage_projects', 'Updated project settings', '{"project_name": "Matts Place"}'),
((SELECT id FROM users LIMIT 1), NULL, 'talent_marketplace', 'Browsed talent marketplace', '{"search_term": "photographer"}'),
((SELECT id FROM users LIMIT 1), NULL, 'client_collaboration', 'Sent feedback to client', '{"client_name": "Matt"}'),
((SELECT id FROM users LIMIT 1), NULL, 'settings', 'Updated user preferences', '{"section": "profile"}')
ON CONFLICT DO NOTHING;
