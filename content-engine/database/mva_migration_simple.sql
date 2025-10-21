-- MVA Database Migration Script (Simplified)
-- This script finalizes the MVA data structure as mandated

-- ============================================================================
-- STEP 1: Rename content_recipes to post_types
-- ============================================================================

ALTER TABLE content_recipes RENAME TO post_types;

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
-- STEP 2: Create tone_profiles table
-- ============================================================================

CREATE TABLE tone_profiles (
    tone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_instruction TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tone_profiles
CREATE INDEX idx_tone_profiles_owner_id ON tone_profiles(owner_id);
CREATE INDEX idx_tone_profiles_is_public ON tone_profiles(is_public);
CREATE INDEX idx_tone_profiles_is_active ON tone_profiles(is_active);
CREATE INDEX idx_tone_profiles_name ON tone_profiles(name);

-- ============================================================================
-- STEP 3: Create content_strategies table
-- ============================================================================

CREATE TABLE content_strategies (
    strategy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tone_id UUID REFERENCES tone_profiles(tone_id) ON DELETE SET NULL,
    strategy_name VARCHAR(255) NOT NULL,
    strategy_description TEXT,
    post_type_mix_targets JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'review')),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for content_strategies
CREATE INDEX idx_content_strategies_project_id ON content_strategies(project_id);
CREATE INDEX idx_content_strategies_status ON content_strategies(status);
CREATE INDEX idx_content_strategies_is_default ON content_strategies(is_default);
CREATE INDEX idx_content_strategies_tone_id ON content_strategies(tone_id);
CREATE INDEX idx_content_strategies_mix_targets ON content_strategies USING GIN (post_type_mix_targets);

-- ============================================================================
-- STEP 4: Create model_configs table
-- ============================================================================

CREATE TABLE model_configs (
    model_id VARCHAR(100) PRIMARY KEY,
    provider_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('image', 'video', 'text')),
    description TEXT,
    adapter_name VARCHAR(255) NOT NULL,
    api_endpoint TEXT NOT NULL,
    api_key_type VARCHAR(50) NOT NULL CHECK (api_key_type IN ('user_specific', 'global')),
    config_options JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    max_concurrent_jobs INTEGER DEFAULT 3,
    estimated_time_seconds INTEGER,
    cost_per_generation DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for model_configs
CREATE INDEX idx_model_configs_type ON model_configs(model_type);
CREATE INDEX idx_model_configs_active ON model_configs(is_active);
CREATE INDEX idx_model_configs_public ON model_configs(is_public);
CREATE INDEX idx_model_configs_adapter ON model_configs(adapter_name);

-- ============================================================================
-- STEP 5: Add industry_niche column to projects table
-- ============================================================================

ALTER TABLE projects ADD COLUMN industry_niche VARCHAR(255);
CREATE INDEX idx_projects_industry_niche ON projects(industry_niche);

-- ============================================================================
-- STEP 6: Create triggers for updated_at timestamps
-- ============================================================================

CREATE TRIGGER update_content_strategies_updated_at
    BEFORE UPDATE ON content_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tone_profiles_updated_at
    BEFORE UPDATE ON tone_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_configs_updated_at
    BEFORE UPDATE ON model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Insert seed data for model_configs
-- ============================================================================

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
);

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
);
