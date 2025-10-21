-- [2025-10-08] - Add variants column to assets table for tracking processed image sizes
-- This allows us to store multiple versions (thumbnail, medium, large, original) of each image

ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance on variants
CREATE INDEX IF NOT EXISTS idx_assets_variants ON assets USING gin(variants);

-- Example of variants structure:
-- {
--   "thumbnail": {
--     "url": "https://cdn.example.com/thumbnail_123.jpg",
--     "path": "project/123/thumbnail_123.jpg",
--     "width": 400,
--     "height": 300,
--     "size": 45678,
--     "format": "jpeg"
--   },
--   "medium": { ... },
--   "large": { ... },
--   "original": { ... }
-- }

COMMENT ON COLUMN assets.variants IS 'JSONB object containing processed image variants (thumbnail, medium, large, original) with metadata';

