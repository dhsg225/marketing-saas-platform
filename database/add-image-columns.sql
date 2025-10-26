-- ============================================================================
-- ADD MISSING IMAGE COLUMNS TO EXISTING TABLES
-- Run this FIRST before the assets migration
-- ============================================================================

-- Add image columns to content_ideas table
ALTER TABLE content_ideas 
ADD COLUMN IF NOT EXISTS full_visual_url TEXT,
ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- Add image columns to posts table (if not already there)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS full_visual_url TEXT;

-- Verify columns were added
SELECT 
  'content_ideas columns' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'content_ideas' 
  AND column_name IN ('full_visual_url', 'image_prompt')
UNION ALL
SELECT 
  'posts columns',
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'posts' 
  AND column_name IN ('attached_asset_url', 'full_visual_url')
ORDER BY table_name, column_name;

