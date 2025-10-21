-- [2025-10-09] - Add color column to content_recipes table
-- This allows post types to have designated colors for visual organization

ALTER TABLE content_recipes
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6366f1';

-- Add index for better query performance on color
CREATE INDEX IF NOT EXISTS idx_content_recipes_color ON content_recipes(color);

-- Update existing records with default colors if they don't have any
UPDATE content_recipes 
SET color = '#6366f1' 
WHERE color IS NULL OR color = '';

-- Add comment for documentation
COMMENT ON COLUMN content_recipes.color IS 'Hex color code for visual identification of this post type (e.g., #6366f1)';

