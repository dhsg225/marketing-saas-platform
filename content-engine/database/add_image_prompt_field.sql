-- [2025-10-19] - Add image_prompt field to posts and content_ideas tables
-- This allows users to store and reuse AI image generation prompts

-- Add image_prompt field to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- Add image_prompt field to content_ideas table  
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS image_prompt TEXT;
