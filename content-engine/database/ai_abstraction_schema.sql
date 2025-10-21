-- AI Abstraction Layer Schema
-- This schema implements a provider-agnostic AI generation system
-- Created: 2025-10-11

-- ============================================================================
-- TABLE: model_configs
-- Stores configuration for all AI models/providers
-- ============================================================================
CREATE TABLE IF NOT EXISTS model_configs (
    -- Primary key: modelId serves as unique identifier
    model_id VARCHAR(100) PRIMARY KEY,
    
    -- Display and organizational fields
    provider_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('image', 'video', 'text')),
    description TEXT,
    
    -- Technical configuration
    adapter_module VARCHAR(255) NOT NULL, -- e.g., 'ApiframeAdapter', 'DalleAdapter'
    api_endpoint TEXT NOT NULL, -- Base URL for the provider
    api_key_type VARCHAR(50) NOT NULL CHECK (api_key_type IN ('user_specific', 'global')),
    
    -- Provider-specific configuration (stored as JSONB for flexibility)
    config_options JSONB DEFAULT '{}',
    
    -- Feature flags and limits
    is_active BOOLEAN DEFAULT true,
    max_concurrent_jobs INTEGER DEFAULT 3,
    estimated_time_seconds INTEGER, -- Estimated generation time
    cost_per_generation DECIMAL(10, 4), -- Cost tracking (optional)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups by type
CREATE INDEX IF NOT EXISTS idx_model_configs_type ON model_configs(model_type);
CREATE INDEX IF NOT EXISTS idx_model_configs_active ON model_configs(is_active);

-- ============================================================================
-- TABLE: ai_generation_jobs
-- Tracks all AI generation requests and their status
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    -- Primary key
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Model reference
    model_id VARCHAR(100) NOT NULL REFERENCES model_configs(model_id) ON DELETE RESTRICT,
    
    -- User tracking
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Request details
    prompt TEXT NOT NULL,
    options JSONB DEFAULT '{}', -- User-provided options (aspect ratio, negative prompt, etc.)
    
    -- Job tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Provider-specific tracking
    provider_job_id VARCHAR(255), -- The external provider's job ID
    provider_metadata JSONB DEFAULT '{}', -- Any provider-specific data
    
    -- Results
    result_assets JSONB DEFAULT '[]', -- Array of generated asset URLs and metadata
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_model ON ai_generation_jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created ON ai_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_provider_id ON ai_generation_jobs(provider_job_id);

-- ============================================================================
-- TABLE: user_api_keys
-- Stores user-specific API keys for BYOK (Bring Your Own Key) models
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_api_keys (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id VARCHAR(100) NOT NULL REFERENCES model_configs(model_id) ON DELETE CASCADE,
    
    -- Encrypted API key storage
    encrypted_api_key TEXT NOT NULL,
    key_name VARCHAR(255), -- Optional friendly name
    
    -- Validation
    is_valid BOOLEAN DEFAULT true,
    last_validated_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one key per user per model
    UNIQUE(user_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);

-- ============================================================================
-- FUNCTION: Update updated_at timestamp automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
DROP TRIGGER IF EXISTS update_model_configs_updated_at ON model_configs;
CREATE TRIGGER update_model_configs_updated_at
    BEFORE UPDATE ON model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_jobs_updated_at ON ai_generation_jobs;
CREATE TRIGGER update_ai_jobs_updated_at
    BEFORE UPDATE ON ai_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Initial model configurations
-- ============================================================================

-- Apiframe (Midjourney) Configuration
INSERT INTO model_configs (
    model_id,
    provider_name,
    model_type,
    adapter_module,
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
    adapter_module,
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

-- DALL-E 2 Configuration (cheaper alternative)
INSERT INTO model_configs (
    model_id,
    provider_name,
    model_type,
    adapter_module,
    api_endpoint,
    api_key_type,
    description,
    config_options,
    estimated_time_seconds,
    cost_per_generation
) VALUES (
    'openai-dalle-2',
    'OpenAI DALL-E 2',
    'image',
    'DalleAdapter',
    'https://api.openai.com/v1',
    'user_specific',
    'Affordable image generation from OpenAI. Good for quick iterations.',
    '{"sizes": ["256x256", "512x512", "1024x1024"]}',
    10,
    0.02
) ON CONFLICT (model_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE model_configs IS 'Configuration for all AI models/providers in the abstraction layer';
COMMENT ON TABLE ai_generation_jobs IS 'Tracks all AI generation requests across all providers';
COMMENT ON TABLE user_api_keys IS 'Stores user-provided API keys for BYOK models';
COMMENT ON COLUMN model_configs.adapter_module IS 'Name of the server-side adapter class that handles this provider';
COMMENT ON COLUMN model_configs.api_key_type IS 'Determines if API key comes from platform (global) or user (user_specific)';
COMMENT ON COLUMN ai_generation_jobs.provider_job_id IS 'The job ID returned by the external provider';
COMMENT ON COLUMN ai_generation_jobs.result_assets IS 'Array of generated assets: [{"url": "...", "metadata": {...}}]';

