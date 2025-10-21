-- MVA Database Migration Script
-- This script finalizes the MVA data structure as mandated
-- Created: 2025-10-12

-- ============================================================================
-- STEP 1: Rename content_recipes to post_types
-- ============================================================================

-- First, rename the table
ALTER TABLE content_recipes RENAME TO post_types;

-- Update any foreign key references in other tables
-- (content_ideas table already has post_type_id column, no rename needed)
-- The foreign key constraint will automatically reference the renamed table

-- Update indexes to reflect new table name
DROP INDEX IF EXISTS idx_content_recipes_project_id;
DROP INDEX IF EXISTS idx_content_recipes_is_active;

CREATE INDEX IF NOT EXISTS idx_post_types_project_id ON post_types(project_id);
CREATE INDEX IF NOT EXISTS idx_post_types_is_active ON post_types(is_active);

-- Update trigger name
DROP TRIGGER IF EXISTS update_content_recipes_updated_at ON post_types;
CREATE TRIGGER update_post_types_updated_at
    BEFORE UPDATE ON post_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 2: Create tone_profiles table (first, as it's referenced by content_strategies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tone_profiles (
    tone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tone identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- The critical system instruction field for AI (Feature 9)
    system_instruction TEXT NOT NULL,
    
    -- Ownership and sharing
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage metadata
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tone_profiles
CREATE INDEX IF NOT EXISTS idx_tone_profiles_owner_id ON tone_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_is_public ON tone_profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_is_active ON tone_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_name ON tone_profiles(name);

-- ============================================================================
-- STEP 3: Create content_strategies table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_strategies (
    strategy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tone_id UUID REFERENCES tone_profiles(tone_id) ON DELETE SET NULL,
    
    -- Core strategy definition
    strategy_name VARCHAR(255) NOT NULL,
    strategy_description TEXT,
    
    -- The critical JSONB field for Content Strategy Visualization (Feature 10)
    post_type_mix_targets JSONB NOT NULL DEFAULT '{}',
    
    -- Strategy metadata
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'review')),
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one default strategy per project
    CONSTRAINT unique_default_strategy_per_project UNIQUE (project_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for content_strategies
CREATE INDEX IF NOT EXISTS idx_content_strategies_project_id ON content_strategies(project_id);
CREATE INDEX IF NOT EXISTS idx_content_strategies_status ON content_strategies(status);
CREATE INDEX IF NOT EXISTS idx_content_strategies_is_default ON content_strategies(is_default);
CREATE INDEX IF NOT EXISTS idx_content_strategies_tone_id ON content_strategies(tone_id);

-- GIN index for JSONB queries on post_type_mix_targets
CREATE INDEX IF NOT EXISTS idx_content_strategies_mix_targets ON content_strategies USING GIN (post_type_mix_targets);

-- ============================================================================
-- STEP 4: Create model_configs table (PostgreSQL replacement for Firestore)
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_configs (
    model_id VARCHAR(100) PRIMARY KEY,
    
    -- Display information
    provider_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('image', 'video', 'text')),
    description TEXT,
    
    -- Technical configuration
    adapter_name VARCHAR(255) NOT NULL, -- The adapter module name (e.g., 'ApiframeAdapter')
    api_endpoint TEXT NOT NULL,
    api_key_type VARCHAR(50) NOT NULL CHECK (api_key_type IN ('user_specific', 'global')),
    
    -- Provider-specific options (JSONB for flexibility)
    config_options JSONB DEFAULT '{}',
    
    -- Feature flags
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE, -- Frontend can read this
    
    -- Usage limits and costs
    max_concurrent_jobs INTEGER DEFAULT 3,
    estimated_time_seconds INTEGER,
    cost_per_generation DECIMAL(10, 4),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for model_configs
CREATE INDEX IF NOT EXISTS idx_model_configs_type ON model_configs(model_type);
CREATE INDEX IF NOT EXISTS idx_model_configs_active ON model_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_model_configs_public ON model_configs(is_public);
CREATE INDEX IF NOT EXISTS idx_model_configs_adapter ON model_configs(adapter_name);

-- ============================================================================
-- STEP 5: Add industry_niche column to projects table
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry_niche VARCHAR(255);

-- Index for industry_niche
CREATE INDEX IF NOT EXISTS idx_projects_industry_niche ON projects(industry_niche);

-- ============================================================================
-- STEP 6: Create triggers for updated_at timestamps
-- ============================================================================

-- Trigger for content_strategies
CREATE TRIGGER update_content_strategies_updated_at
    BEFORE UPDATE ON content_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tone_profiles
CREATE TRIGGER update_tone_profiles_updated_at
    BEFORE UPDATE ON tone_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for model_configs
CREATE TRIGGER update_model_configs_updated_at
    BEFORE UPDATE ON model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Insert seed data for model_configs
-- ============================================================================

-- Apiframe (Midjourney) Configuration
INSERT INTO model_configs (
    model_id,
    provider_name,
    model_type,
    adapter_name,
    api_endpoint,
    api_key_type,
    description,
    config_options,
    estimated_time_seconds,
    cost_per_generation
) VALUES (
    'apiframe-midjourney-v6',
    'Apiframe (Midjourney v6)',
    'image',
    'ApiframeAdapter',
    'https://api.apiframe.ai',
    'global',
    'High-quality artistic image generation powered by Midjourney v6',
    '{"default_aspect_ratio": "1:1", "supports_upscale": true, "supports_variations": true}',
    60,
    0.05
) ON CONFLICT (model_id) DO NOTHING;

-- DALL-E 3 Configuration
INSERT INTO model_configs (
    model_id,
    provider_name,
    model_type,
    adapter_name,
    api_endpoint,
    api_key_type,
    description,
    config_options,
    estimated_time_seconds,
    cost_per_generation
) VALUES (
    'openai-dalle-3',
    'OpenAI DALL-E 3',
    'image',
    'DalleAdapter',
    'https://api.openai.com/v1',
    'user_specific',
    'Fast, reliable image generation from OpenAI. Supports BYOK.',
    '{"sizes": ["1024x1024", "1024x1792", "1792x1024"], "quality": ["standard", "hd"]}',
    15,
    0.04
) ON CONFLICT (model_id) DO NOTHING;

-- ============================================================================
-- STEP 8: Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE post_types IS 'Content taxonomy and recipes (renamed from content_recipes)';
COMMENT ON TABLE content_strategies IS 'Client content strategy definitions with mix targets for visualization';
COMMENT ON TABLE tone_profiles IS 'AI system instruction profiles for consistent brand voice';
COMMENT ON TABLE model_configs IS 'AI provider configuration (PostgreSQL replacement for Firestore)';

COMMENT ON COLUMN content_strategies.post_type_mix_targets IS 'JSONB field defining strategic content mix percentages for pie chart visualization';
COMMENT ON COLUMN tone_profiles.system_instruction IS 'Exact text passed to AI models for consistent tone/style';
COMMENT ON COLUMN model_configs.adapter_name IS 'Server-side adapter module name (e.g., ApiframeAdapter)';
COMMENT ON COLUMN projects.industry_niche IS 'Specific industry niche for Knowledge Base targeting (e.g., Italian Fine Dining)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify the migration by checking table existence and structure
DO $$
BEGIN
    RAISE NOTICE 'MVA Migration Status:';
    RAISE NOTICE '- post_types table: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_types') THEN 'CREATED' ELSE 'MISSING' END;
    RAISE NOTICE '- content_strategies table: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_strategies') THEN 'CREATED' ELSE 'MISSING' END;
    RAISE NOTICE '- tone_profiles table: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tone_profiles') THEN 'CREATED' ELSE 'MISSING' END;
    RAISE NOTICE '- model_configs table: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_configs') THEN 'CREATED' ELSE 'MISSING' END;
    RAISE NOTICE '- projects.industry_niche column: %', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'industry_niche') THEN 'ADDED' ELSE 'MISSING' END;
    RAISE NOTICE 'MVA Migration: COMPLETE';
END $$;
