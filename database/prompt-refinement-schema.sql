-- AI-Powered Image Prompt Refinement System Database Schema
-- This schema supports iterative prompt improvement based on client feedback

-- Table: prompt_refinement_sessions
-- Tracks each refinement session for a post/content idea
CREATE TABLE IF NOT EXISTS prompt_refinement_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    content_idea_id UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
    original_prompt TEXT NOT NULL,
    current_prompt TEXT NOT NULL,
    session_status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one of post_id or content_idea_id is set
    CONSTRAINT check_single_source CHECK (
        (post_id IS NOT NULL AND content_idea_id IS NULL) OR 
        (post_id IS NULL AND content_idea_id IS NOT NULL)
    )
);

-- Table: prompt_feedback
-- Stores client feedback and AI-suggested improvements
CREATE TABLE IF NOT EXISTS prompt_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES prompt_refinement_sessions(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL, -- 'client_feedback', 'ai_suggestion', 'manual_edit'
    feedback_text TEXT NOT NULL,
    ai_suggested_prompt TEXT, -- AI's refined version
    final_prompt TEXT, -- User-approved final version
    feedback_author UUID REFERENCES users(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: prompt_iterations
-- Tracks each version of the prompt with metadata
CREATE TABLE IF NOT EXISTS prompt_iterations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES prompt_refinement_sessions(id) ON DELETE CASCADE,
    iteration_number INTEGER NOT NULL,
    prompt_text TEXT NOT NULL,
    iteration_type VARCHAR(50) NOT NULL, -- 'original', 'ai_refined', 'manual_edit', 'client_approved'
    ai_confidence DECIMAL(3,2), -- 0.00 to 1.00 confidence score
    generation_metadata JSONB, -- AI model info, parameters, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure iteration numbers are sequential per session
    UNIQUE(session_id, iteration_number)
);

-- Table: image_generation_results
-- Links refined prompts to generated images
CREATE TABLE IF NOT EXISTS image_generation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES prompt_refinement_sessions(id) ON DELETE CASCADE,
    iteration_id UUID REFERENCES prompt_iterations(id) ON DELETE CASCADE,
    generated_image_url TEXT NOT NULL,
    image_metadata JSONB, -- Dimensions, format, file size, etc.
    generation_job_id VARCHAR(255), -- Reference to AI generation job
    generation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Table: prompt_comparisons
-- Stores side-by-side comparison data for UI
CREATE TABLE IF NOT EXISTS prompt_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES prompt_refinement_sessions(id) ON DELETE CASCADE,
    original_iteration_id UUID REFERENCES prompt_iterations(id) ON DELETE CASCADE,
    refined_iteration_id UUID REFERENCES prompt_iterations(id) ON DELETE CASCADE,
    comparison_metadata JSONB, -- UI state, user preferences, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_post_id ON prompt_refinement_sessions(post_id);
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_content_idea_id ON prompt_refinement_sessions(content_idea_id);
CREATE INDEX IF NOT EXISTS idx_prompt_sessions_status ON prompt_refinement_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_prompt_feedback_session_id ON prompt_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_prompt_iterations_session_id ON prompt_iterations(session_id);
CREATE INDEX IF NOT EXISTS idx_image_results_session_id ON image_generation_results(session_id);

-- RLS Policies (Row Level Security)
ALTER TABLE prompt_refinement_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access sessions for their organization
CREATE POLICY "Users can access sessions for their organization" ON prompt_refinement_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = prompt_refinement_sessions.post_id 
            AND p.project_id IN (
                SELECT id FROM projects 
                WHERE organization_id IN (
                    SELECT organization_id FROM user_organizations 
                    WHERE user_id = auth.uid()
                )
            )
        ) OR EXISTS (
            SELECT 1 FROM content_ideas ci 
            WHERE ci.id = prompt_refinement_sessions.content_idea_id 
            AND ci.project_id IN (
                SELECT id FROM projects 
                WHERE organization_id IN (
                    SELECT organization_id FROM user_organizations 
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

-- Similar policies for other tables
CREATE POLICY "Users can access feedback for their sessions" ON prompt_feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prompt_refinement_sessions prs
            WHERE prs.id = prompt_feedback.session_id
            AND (
                EXISTS (
                    SELECT 1 FROM posts p 
                    WHERE p.id = prs.post_id 
                    AND p.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                ) OR EXISTS (
                    SELECT 1 FROM content_ideas ci 
                    WHERE ci.id = prs.content_idea_id 
                    AND ci.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                )
            )
        )
    );

-- Apply similar policies to other tables
CREATE POLICY "Users can access iterations for their sessions" ON prompt_iterations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prompt_refinement_sessions prs
            WHERE prs.id = prompt_iterations.session_id
            AND (
                EXISTS (
                    SELECT 1 FROM posts p 
                    WHERE p.id = prs.post_id 
                    AND p.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                ) OR EXISTS (
                    SELECT 1 FROM content_ideas ci 
                    WHERE ci.id = prs.content_idea_id 
                    AND ci.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                )
            )
        )
    );

CREATE POLICY "Users can access image results for their sessions" ON image_generation_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prompt_refinement_sessions prs
            WHERE prs.id = image_generation_results.session_id
            AND (
                EXISTS (
                    SELECT 1 FROM posts p 
                    WHERE p.id = prs.post_id 
                    AND p.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                ) OR EXISTS (
                    SELECT 1 FROM content_ideas ci 
                    WHERE ci.id = prs.content_idea_id 
                    AND ci.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                )
            )
        )
    );

CREATE POLICY "Users can access comparisons for their sessions" ON prompt_comparisons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prompt_refinement_sessions prs
            WHERE prs.id = prompt_comparisons.session_id
            AND (
                EXISTS (
                    SELECT 1 FROM posts p 
                    WHERE p.id = prs.post_id 
                    AND p.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                ) OR EXISTS (
                    SELECT 1 FROM content_ideas ci 
                    WHERE ci.id = prs.content_idea_id 
                    AND ci.project_id IN (
                        SELECT id FROM projects 
                        WHERE organization_id IN (
                            SELECT organization_id FROM user_organizations 
                            WHERE user_id = auth.uid()
                        )
                    )
                )
            )
        )
    );

-- Add image_prompt field to posts and content_ideas if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_prompt TEXT;
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- Create function to automatically create initial iteration
CREATE OR REPLACE FUNCTION create_initial_prompt_iteration()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial iteration when session is created
    INSERT INTO prompt_iterations (
        session_id,
        iteration_number,
        prompt_text,
        iteration_type,
        created_at
    ) VALUES (
        NEW.id,
        1,
        NEW.original_prompt,
        'original',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for initial iteration
CREATE TRIGGER trigger_create_initial_iteration
    AFTER INSERT ON prompt_refinement_sessions
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_prompt_iteration();

-- Create function to update session timestamps
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session updates
CREATE TRIGGER trigger_update_session_timestamp
    BEFORE UPDATE ON prompt_refinement_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_timestamp();
