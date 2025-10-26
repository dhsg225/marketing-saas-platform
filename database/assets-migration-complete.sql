-- ============================================================================
-- COMPLETE ASSETS MIGRATION - CLEAN ARCHITECTURE
-- Creates assets table, migrates existing images, updates references
-- ============================================================================

-- Step 0: Add missing columns to existing assets table (if it exists)
-- ============================================================================
DO $$ 
BEGIN
  -- Add cdn_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'cdn_url'
  ) THEN
    ALTER TABLE assets ADD COLUMN cdn_url TEXT;
  END IF;
  
  -- Add url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'url'
  ) THEN
    ALTER TABLE assets ADD COLUMN url TEXT;
  END IF;
  
  -- Add file_size column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE assets ADD COLUMN file_size BIGINT;
  END IF;
  
  -- Add width column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'width'
  ) THEN
    ALTER TABLE assets ADD COLUMN width INTEGER;
  END IF;
  
  -- Add height column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'height'
  ) THEN
    ALTER TABLE assets ADD COLUMN height INTEGER;
  END IF;
  
  -- Add mime_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE assets ADD COLUMN mime_type TEXT;
  END IF;
  
  -- Add variants column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'variants'
  ) THEN
    ALTER TABLE assets ADD COLUMN variants JSONB;
  END IF;
  
  -- Add image_prompt column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'image_prompt'
  ) THEN
    ALTER TABLE assets ADD COLUMN image_prompt TEXT;
  END IF;
  
  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assets' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE assets ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Step 1: Create assets table
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
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  
  -- Storage (supports both external URLs and BunnyCDN paths)
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL, -- Direct access URL
  cdn_url TEXT,
  
  -- Image variants for optimization
  variants JSONB,
  
  -- AI Generation metadata
  image_prompt TEXT,
  metadata JSONB,
  
  -- Processing status
  processing_status TEXT DEFAULT 'completed',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Step 2: Migrate existing images from content_ideas
-- ============================================================================
INSERT INTO assets (
  id,
  scope,
  organization_id,
  project_id,
  owner_user_id,
  file_name,
  storage_path,
  url,
  cdn_url,
  image_prompt,
  metadata,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  'project' as scope,
  p.organization_id,
  ci.project_id,
  NULL as owner_user_id, -- content_ideas doesn't have owner_id
  COALESCE(ci.title, 'Content Idea Image') as file_name,
  ci.full_visual_url as storage_path,
  ci.full_visual_url as url,
  ci.full_visual_url as cdn_url,
  ci.image_prompt,
  jsonb_build_object(
    'aiGenerated', CASE WHEN ci.image_prompt IS NOT NULL THEN true ELSE false END,
    'source', 'content_ideas',
    'contentIdeaId', ci.id::text,
    'migratedAt', NOW()::text
  ) as metadata,
  ci.created_at
FROM content_ideas ci
JOIN projects p ON ci.project_id = p.id
WHERE ci.full_visual_url IS NOT NULL 
  AND ci.full_visual_url != ''
  AND NOT EXISTS (
    -- Avoid duplicates if run multiple times
    SELECT 1 FROM assets a 
    WHERE a.url = ci.full_visual_url 
    AND a.metadata->>'contentIdeaId' = ci.id::text
  );

-- ============================================================================
-- Step 3: Migrate images from posts table
-- ============================================================================
INSERT INTO assets (
  id,
  scope,
  organization_id,
  project_id,
  owner_user_id,
  file_name,
  storage_path,
  url,
  cdn_url,
  metadata,
  created_at
)
SELECT 
  gen_random_uuid() as id,
  'project' as scope,
  p.organization_id,
  po.project_id,
  p.organization_id as owner_user_id, -- posts don't have owner_id, use org
  COALESCE(po.title, 'Post Image') as file_name,
  po.attached_asset_url as storage_path,
  po.attached_asset_url as url,
  po.attached_asset_url as cdn_url,
  jsonb_build_object(
    'source', 'posts',
    'postId', po.id::text,
    'migratedAt', NOW()::text
  ) as metadata,
  po.created_at
FROM posts po
JOIN projects p ON po.project_id = p.id
WHERE po.attached_asset_url IS NOT NULL 
  AND po.attached_asset_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM assets a 
    WHERE a.url = po.attached_asset_url 
    AND a.metadata->>'postId' = po.id::text
  );

-- ============================================================================
-- Step 4: Add asset_id foreign key to content_ideas (for future use)
-- ============================================================================
ALTER TABLE content_ideas 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Update content_ideas to reference migrated assets
UPDATE content_ideas ci
SET asset_id = a.id
FROM assets a
WHERE a.url = ci.full_visual_url
  AND a.metadata->>'contentIdeaId' = ci.id::text
  AND ci.full_visual_url IS NOT NULL;

-- ============================================================================
-- Step 5: Add asset_id foreign key to posts (for future use)
-- ============================================================================
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Update posts to reference migrated assets
UPDATE posts po
SET asset_id = a.id
FROM assets a
WHERE a.url = po.attached_asset_url
  AND a.metadata->>'postId' = po.id::text
  AND po.attached_asset_url IS NOT NULL;

-- ============================================================================
-- Step 6: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_assets_scope ON assets(scope);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_organization ON assets(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_url ON assets(url);

CREATE INDEX IF NOT EXISTS idx_content_ideas_asset ON content_ideas(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_asset ON posts(asset_id) WHERE asset_id IS NOT NULL;

-- ============================================================================
-- Step 7: Enable Row Level Security
-- ============================================================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS assets_select_policy ON assets;
DROP POLICY IF EXISTS assets_insert_policy ON assets;
DROP POLICY IF EXISTS assets_update_policy ON assets;
DROP POLICY IF EXISTS assets_delete_policy ON assets;

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

-- Users can update their own assets or organization assets
CREATE POLICY assets_update_policy ON assets
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- Users can delete their own assets or organization assets
CREATE POLICY assets_delete_policy ON assets
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
  );

-- ============================================================================
-- Step 8: Create analytics view
-- ============================================================================
CREATE OR REPLACE VIEW v_asset_analytics AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  COUNT(a.id) as total_assets,
  COUNT(a.id) FILTER (WHERE a.metadata->>'aiGenerated' = 'true') as ai_generated_count,
  COUNT(a.id) FILTER (WHERE a.metadata->>'source' = 'content_ideas') as from_content_ideas,
  COUNT(a.id) FILTER (WHERE a.metadata->>'source' = 'posts') as from_posts,
  SUM(a.file_size) as total_storage_bytes,
  MAX(a.created_at) as last_asset_created
FROM projects p
LEFT JOIN assets a ON a.project_id = p.id
GROUP BY p.id, p.name;

-- ============================================================================
-- Migration Summary Query
-- ============================================================================
-- Run this to verify migration:
SELECT 
  'Total Assets' as metric,
  COUNT(*)::text as value
FROM assets
UNION ALL
SELECT 
  'From Content Ideas',
  COUNT(*)::text
FROM assets
WHERE metadata->>'source' = 'content_ideas'
UNION ALL
SELECT 
  'From Posts',
  COUNT(*)::text
FROM assets
WHERE metadata->>'source' = 'posts'
UNION ALL
SELECT 
  'Content Ideas with asset_id',
  COUNT(*)::text
FROM content_ideas
WHERE asset_id IS NOT NULL
UNION ALL
SELECT 
  'Posts with asset_id',
  COUNT(*)::text
FROM posts
WHERE asset_id IS NOT NULL;

