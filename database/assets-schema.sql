-- ============================================================================
-- ASSETS TABLE SCHEMA
-- Centralized storage for all media assets (images, videos, documents)
-- Supports multi-level scoping: user, project, organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS assets (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope and ownership
  scope TEXT NOT NULL CHECK (scope IN ('user', 'project', 'organization')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- File information
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT, -- Size in bytes
  width INTEGER,
  height INTEGER,
  
  -- Storage
  storage_path TEXT NOT NULL, -- Primary storage URL/path
  url TEXT, -- Direct access URL (for compatibility)
  cdn_url TEXT, -- CDN URL if using CDN
  
  -- Image variants (thumbnails, optimized versions, etc.)
  variants JSONB, -- { "thumbnail": { "url": "...", "width": 200, "height": 200 }, "medium": {...}, "original": {...} }
  
  -- AI Generation metadata
  image_prompt TEXT, -- Original AI prompt if AI-generated
  metadata JSONB, -- { "aiGenerated": true, "provider": "midjourney", "prompt": "...", "generatedAt": "..." }
  
  -- Processing status
  processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  -- At least one scope ID must be provided
  CONSTRAINT at_least_one_scope CHECK (
    (scope = 'user' AND owner_user_id IS NOT NULL) OR
    (scope = 'project' AND project_id IS NOT NULL) OR
    (scope = 'organization' AND organization_id IS NOT NULL)
  )
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Fast lookups by scope
CREATE INDEX idx_assets_scope ON assets(scope);
CREATE INDEX idx_assets_project ON assets(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_assets_organization ON assets(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_assets_user ON assets(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Fast lookups by creation date (for recent assets)
CREATE INDEX idx_assets_created ON assets(created_at DESC);

-- Fast lookups for AI-generated assets
CREATE INDEX idx_assets_ai_generated ON assets((metadata->>'aiGenerated')) WHERE metadata->>'aiGenerated' = 'true';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Users can see assets in their organizations
CREATE POLICY assets_select_policy ON assets
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- Users can insert assets into their organizations
CREATE POLICY assets_insert_policy ON assets
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- Users can update assets they own or in their organizations
CREATE POLICY assets_update_policy ON assets
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- Users can delete assets they own or in their organizations
CREATE POLICY assets_delete_policy ON assets
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- ============================================================================
-- Migration: Import existing images from content_ideas and ai_image_generation_logs
-- ============================================================================

-- Import images from content_ideas table
INSERT INTO assets (
  scope,
  organization_id,
  project_id,
  owner_user_id,
  file_name,
  storage_path,
  url,
  image_prompt,
  metadata,
  created_at
)
SELECT 
  'project' as scope,
  p.organization_id,
  ci.project_id,
  ci.owner_id as owner_user_id,
  COALESCE(ci.title, 'Content Idea Image') as file_name,
  ci.full_visual_url as storage_path,
  ci.full_visual_url as url,
  ci.image_prompt,
  jsonb_build_object(
    'aiGenerated', true,
    'source', 'content_ideas',
    'contentIdeaId', ci.id::text,
    'importedAt', NOW()
  ) as metadata,
  ci.created_at
FROM content_ideas ci
JOIN projects p ON ci.project_id = p.id
WHERE ci.full_visual_url IS NOT NULL 
  AND ci.full_visual_url != ''
ON CONFLICT (id) DO NOTHING;

-- Import images from ai_image_generation_logs
INSERT INTO assets (
  scope,
  organization_id,
  project_id,
  owner_user_id,
  file_name,
  storage_path,
  url,
  image_prompt,
  metadata,
  created_at
)
SELECT 
  'project' as scope,
  l.organization_id,
  l.project_id,
  l.user_id as owner_user_id,
  'AI Generated - ' || LEFT(l.prompt, 30) || '...' as file_name,
  l.image_url as storage_path,
  l.image_url as url,
  l.prompt as image_prompt,
  jsonb_build_object(
    'aiGenerated', true,
    'source', 'ai_generation_logs',
    'provider', (SELECT provider FROM ai_image_models WHERE id = l.model_id),
    'modelId', l.model_id,
    'generationTime', l.generation_time,
    'cost', l.cost,
    'importedAt', NOW()
  ) as metadata,
  l.created_at
FROM ai_image_generation_logs l
WHERE l.success = true 
  AND l.image_url IS NOT NULL 
  AND l.image_url != ''
  AND l.project_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

