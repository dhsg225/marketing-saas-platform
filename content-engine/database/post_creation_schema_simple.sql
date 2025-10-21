-- Post Creation System Schema (Simplified)
-- Creates tables in the correct order

-- Posts table (main container)
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    created_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Post creation mode
    creation_mode VARCHAR(20) NOT NULL CHECK (creation_mode IN ('all_at_once', 'by_parts')),
    
    -- Post metadata
    platform VARCHAR(50),
    post_type_id UUID,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'published', 'cancelled')),
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    published_at TIMESTAMP,
    
    -- All-at-Once mode content
    full_content TEXT,
    full_visual_url TEXT,
    full_visual_alt_text TEXT,
    
    -- Metadata
    tags TEXT[],
    hashtags TEXT[],
    mentions TEXT[],
    
    -- Analytics tracking
    engagement_metrics JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post sections table (for By-Parts mode)
CREATE TABLE IF NOT EXISTS post_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    
    -- Section type and order
    section_type VARCHAR(30) NOT NULL CHECK (section_type IN ('tease_hook', 'body_content', 'cta', 'signature_block')),
    section_order INTEGER NOT NULL DEFAULT 1,
    
    -- Section content
    content TEXT NOT NULL,
    visual_url TEXT,
    visual_alt_text TEXT,
    
    -- AI generation metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_model VARCHAR(50),
    ai_prompt TEXT,
    ai_confidence DECIMAL(3,2),
    
    -- Section status
    is_locked BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique section types per post
    UNIQUE(post_id, section_type)
);

-- Post generation history (tracks AI generations)
CREATE TABLE IF NOT EXISTS post_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    section_id UUID,
    
    -- Generation details
    generation_type VARCHAR(30) NOT NULL CHECK (generation_type IN ('full_post', 'section_content', 'visual', 'optimization')),
    ai_model VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    
    -- Generation metadata
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    confidence_score DECIMAL(3,2),
    
    -- User interaction
    user_approved BOOLEAN DEFAULT FALSE,
    user_modified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_project_id ON posts(project_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_by ON posts(created_by);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_date ON posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_posts_creation_mode ON posts(creation_mode);

CREATE INDEX IF NOT EXISTS idx_post_sections_post_id ON post_sections(post_id);
CREATE INDEX IF NOT EXISTS idx_post_sections_type ON post_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_post_sections_order ON post_sections(post_id, section_order);

CREATE INDEX IF NOT EXISTS idx_post_generation_history_post_id ON post_generation_history(post_id);
CREATE INDEX IF NOT EXISTS idx_post_generation_history_section_id ON post_generation_history(section_id);
CREATE INDEX IF NOT EXISTS idx_post_generation_history_type ON post_generation_history(generation_type);
