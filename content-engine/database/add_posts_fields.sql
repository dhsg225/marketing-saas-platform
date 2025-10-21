-- [2025-10-20] - Add fields to posts table for inline content editor
-- Adds concept_id, version, image_prompt, and generated_image fields

-- Add concept_id field to link posts to their original concepts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS concept_id VARCHAR(255);

-- Add version field for content versioning
ALTER TABLE posts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add image_prompt field for AI image generation prompts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- Add generated_image field for storing generated image URLs
ALTER TABLE posts ADD COLUMN IF NOT EXISTS generated_image TEXT;

-- Add comments for clarity
COMMENT ON COLUMN posts.concept_id IS 'Links to the original content_ideas concept';
COMMENT ON COLUMN posts.version IS 'Version number for content iteration tracking';
COMMENT ON COLUMN posts.image_prompt IS 'AI prompt used for image generation';
COMMENT ON COLUMN posts.generated_image IS 'URL of the generated image';

-- Create index on concept_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_posts_concept_id ON posts(concept_id);


