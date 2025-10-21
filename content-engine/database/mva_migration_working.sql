-- MVA Database Migration Script (Working)
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
-- STEP 2: Create tone_profiles table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tone_profiles (
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
CREATE INDEX IF NOT EXISTS idx_tone_profiles_owner_id ON tone_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_is_public ON tone_profiles(is_public);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_is_active ON tone_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_tone_profiles_name ON tone_profiles(name);

-- ============================================================================
-- STEP 3: Create content_strategies table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_strategies (
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
CREATE INDEX IF NOT EXISTS idx_content_strategies_project_id ON content_strategies(project_id);
CREATE INDEX IF NOT EXISTS idx_content_strategies_status ON content_strategies(status);
CREATE INDEX IF NOT EXISTS idx_content_strategies_is_default ON content_strategies(is_default);
CREATE INDEX IF NOT EXISTS idx_content_strategies_tone_id ON content_strategies(tone_id);
CREATE INDEX IF NOT EXISTS idx_content_strategies_mix_targets ON content_strategies USING GIN (post_type_mix_targets);

-- ============================================================================
-- STEP 4: Add missing columns to existing model_configs table
-- ============================================================================

-- Add missing columns to existing model_configs table if needed
ALTER TABLE model_configs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Create missing indexes for model_configs
CREATE INDEX IF NOT EXISTS idx_model_configs_public ON model_configs(is_public);

-- ============================================================================
-- STEP 5: Add industry_niche column to projects table
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry_niche VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_projects_industry_niche ON projects(industry_niche);

-- ============================================================================
-- STEP 6: Create triggers for updated_at timestamps
-- ============================================================================

CREATE TRIGGER update_tone_profiles_updated_at
    BEFORE UPDATE ON tone_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_strategies_updated_at
    BEFORE UPDATE ON content_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
