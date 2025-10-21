-- [2025-10-09] - Add schedule fields to content_recipes table
-- This allows tracking when a Post Type is scheduled for content generation

ALTER TABLE content_recipes
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

ALTER TABLE content_recipes
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Add index for better query performance on scheduled content
CREATE INDEX IF NOT EXISTS idx_content_recipes_scheduled_date ON content_recipes(scheduled_date);

-- Add comment for documentation
COMMENT ON COLUMN content_recipes.scheduled_date IS 'Date when this Post Type is scheduled for content generation';
COMMENT ON COLUMN content_recipes.scheduled_time IS 'Time when this Post Type is scheduled for content generation';
