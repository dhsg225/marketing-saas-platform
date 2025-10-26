-- ============================================================================
-- Eden AI Image Models - Database Schema
-- ============================================================================
-- Purpose: Store AI image generation models with admin-controlled access
-- Created: October 23, 2025
-- ============================================================================

-- Drop existing table if re-running migration (be careful in production!)
DROP TABLE IF EXISTS ai_image_generation_logs CASCADE;
DROP TABLE IF EXISTS ai_image_models CASCADE;

-- ============================================================================
-- Table: ai_image_models
-- ============================================================================
-- Stores available AI image generation models from Eden AI
-- Admin can enable/disable models to control which appear to end users
-- ============================================================================

CREATE TABLE ai_image_models (
  -- Primary identification
  id TEXT PRIMARY KEY,                      -- e.g., "openai-dall-e-3"
  provider TEXT NOT NULL,                   -- e.g., "openai", "stabilityai"
  name TEXT NOT NULL,                       -- e.g., "DALL-E 3", "Stable Diffusion XL"
  model_identifier TEXT NOT NULL,           -- Eden AI's provider string for API calls
  
  -- Status and configuration
  enabled BOOLEAN DEFAULT false NOT NULL,   -- Admin controls visibility to users
  display_order INTEGER DEFAULT 0,          -- Sort order in UI (lower = first)
  
  -- Model information
  description TEXT,                         -- User-friendly description
  estimated_time INTEGER,                   -- Average generation time in seconds
  cost_per_generation DECIMAL(10, 4),       -- Cost in USD per image
  
  -- Technical capabilities
  supported_resolutions JSONB,              -- Array: ["512x512", "1024x1024", "1792x1024"]
  max_resolution TEXT,                      -- e.g., "1792x1024"
  features JSONB,                           -- Array: ["prompt_understanding", "style_control"]
  
  -- Additional metadata
  icon_url TEXT,                            -- Optional: Logo/icon for provider
  documentation_url TEXT,                   -- Link to provider docs
  requires_api_key BOOLEAN DEFAULT false,   -- If user needs their own key
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_cost CHECK (cost_per_generation >= 0),
  CONSTRAINT valid_time CHECK (estimated_time > 0),
  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- ============================================================================
-- Table: ai_image_generation_logs
-- ============================================================================
-- Usage tracking for monitoring and analytics (Phase 2)
-- Records every image generation attempt for cost tracking and analysis
-- ============================================================================

CREATE TABLE ai_image_generation_logs (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  model_id TEXT REFERENCES ai_image_models(id) ON DELETE SET NULL,
  project_id UUID,                          -- Optional: link to project
  
  -- Request details
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  resolution TEXT,                          -- e.g., "1024x1024"
  options JSONB,                            -- Additional generation options
  
  -- Response details
  success BOOLEAN DEFAULT false NOT NULL,
  generation_time INTEGER,                  -- Actual time taken in milliseconds
  cost DECIMAL(10, 4),                      -- Actual cost incurred
  error_message TEXT,                       -- If failed, what went wrong
  image_url TEXT,                           -- Generated image URL if successful
  
  -- Metadata
  ip_address TEXT,                          -- For abuse prevention
  user_agent TEXT,                          -- Client information
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_generation_cost CHECK (cost >= 0),
  CONSTRAINT valid_generation_time CHECK (generation_time >= 0)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Fast lookup of enabled models ordered by display preference
CREATE INDEX idx_ai_models_enabled_order ON ai_image_models(enabled, display_order) 
  WHERE enabled = true;

-- Fast provider lookups
CREATE INDEX idx_ai_models_provider ON ai_image_models(provider);

-- Usage logs - for analytics queries
CREATE INDEX idx_generation_logs_user ON ai_image_generation_logs(user_id, created_at DESC);
CREATE INDEX idx_generation_logs_org ON ai_image_generation_logs(organization_id, created_at DESC);
CREATE INDEX idx_generation_logs_model ON ai_image_generation_logs(model_id, created_at DESC);
CREATE INDEX idx_generation_logs_success ON ai_image_generation_logs(success, created_at DESC);
CREATE INDEX idx_generation_logs_created_at ON ai_image_generation_logs(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE ai_image_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_generation_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: ai_image_models
-- ============================================================================

-- Anyone can view enabled models (for image generation UI)
CREATE POLICY "Anyone can view enabled models" 
  ON ai_image_models
  FOR SELECT 
  USING (enabled = true);

-- Authenticated users can view all models (for admin UI)
CREATE POLICY "Authenticated users can view all models" 
  ON ai_image_models
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only service role can insert/update/delete (admin operations via backend)
CREATE POLICY "Service role can manage models" 
  ON ai_image_models
  FOR ALL 
  USING (auth.role() = 'service_role');

-- ============================================================================
-- RLS Policies: ai_image_generation_logs
-- ============================================================================

-- Users can view their own generation logs
CREATE POLICY "Users can view own generation logs" 
  ON ai_image_generation_logs
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can insert logs (backend only)
CREATE POLICY "Service role can insert logs" 
  ON ai_image_generation_logs
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Organization members can view org logs
CREATE POLICY "Organization members can view org logs" 
  ON ai_image_generation_logs
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_ai_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_models_timestamp
  BEFORE UPDATE ON ai_image_models
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_models_updated_at();

-- ============================================================================
-- Helpful Views (Optional - for admin analytics)
-- ============================================================================

-- View: Popular models by usage
CREATE OR REPLACE VIEW v_popular_ai_models AS
SELECT 
  m.id,
  m.name,
  m.provider,
  COUNT(l.id) as total_generations,
  COUNT(CASE WHEN l.success THEN 1 END) as successful_generations,
  COUNT(CASE WHEN NOT l.success THEN 1 END) as failed_generations,
  ROUND(AVG(l.generation_time)::NUMERIC, 2) as avg_generation_time_ms,
  ROUND(SUM(l.cost)::NUMERIC, 2) as total_cost_usd,
  MAX(l.created_at) as last_used_at
FROM ai_image_models m
LEFT JOIN ai_image_generation_logs l ON m.id = l.model_id
GROUP BY m.id, m.name, m.provider
ORDER BY total_generations DESC;

-- View: Daily usage statistics
CREATE OR REPLACE VIEW v_daily_ai_usage AS
SELECT 
  DATE(created_at) as usage_date,
  model_id,
  COUNT(*) as total_generations,
  COUNT(CASE WHEN success THEN 1 END) as successful_generations,
  ROUND(SUM(cost)::NUMERIC, 2) as total_cost_usd,
  ROUND(AVG(generation_time)::NUMERIC, 2) as avg_generation_time_ms
FROM ai_image_generation_logs
GROUP BY DATE(created_at), model_id
ORDER BY usage_date DESC, total_generations DESC;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE ai_image_models IS 'Available AI image generation models from Eden AI with admin-controlled access';
COMMENT ON COLUMN ai_image_models.id IS 'Unique identifier: provider-model format (e.g., openai-dall-e-3)';
COMMENT ON COLUMN ai_image_models.enabled IS 'Admin controls - only enabled models shown to users';
COMMENT ON COLUMN ai_image_models.model_identifier IS 'Eden AI provider string used in API calls';
COMMENT ON COLUMN ai_image_models.display_order IS 'Sort order in UI - lower numbers appear first';

COMMENT ON TABLE ai_image_generation_logs IS 'Usage tracking for all AI image generation attempts';
COMMENT ON COLUMN ai_image_generation_logs.generation_time IS 'Actual generation time in milliseconds';
COMMENT ON COLUMN ai_image_generation_logs.cost IS 'Actual cost in USD for this generation';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant select on views to authenticated users
GRANT SELECT ON v_popular_ai_models TO authenticated;
GRANT SELECT ON v_daily_ai_usage TO authenticated;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Eden AI Models schema created successfully!';
  RAISE NOTICE '📊 Tables created: ai_image_models, ai_image_generation_logs';
  RAISE NOTICE '🔐 RLS policies enabled';
  RAISE NOTICE '📈 Analytics views created';
  RAISE NOTICE '🎯 Next step: Run seed data script to populate Top 10 models';
END $$;

