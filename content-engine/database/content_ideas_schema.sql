-- [2025-10-09] - Content Ideas/Topics System
-- This table stores content ideas/topics that are linked to Post Types
-- These can be scheduled on calendar and approved before content generation

CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  post_type_id UUID NOT NULL REFERENCES content_recipes(id) ON DELETE CASCADE,
  
  -- Basic idea information
  title VARCHAR(255) NOT NULL,
  description TEXT,
  topic_keywords TEXT[], -- Array of keywords related to this topic
  
  -- Scheduling information
  suggested_date DATE,
  suggested_time TIME,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status and workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'approved', 'in_progress', 'completed', 'cancelled')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Content generation
  generated_content_id UUID, -- Link to generated content when created
  notes TEXT, -- Internal notes about this idea
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_ideas_project_id ON content_ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_post_type_id ON content_ideas(post_type_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_status ON content_ideas(status);
CREATE INDEX IF NOT EXISTS idx_content_ideas_suggested_date ON content_ideas(suggested_date);
CREATE INDEX IF NOT EXISTS idx_content_ideas_priority ON content_ideas(priority);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_content_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_content_ideas_updated_at
  BEFORE UPDATE ON content_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_content_ideas_updated_at();

-- Add comments for documentation
COMMENT ON TABLE content_ideas IS 'Content ideas/topics linked to Post Types for calendar planning and content generation';
COMMENT ON COLUMN content_ideas.title IS 'Brief title/summary of the content idea';
COMMENT ON COLUMN content_ideas.description IS 'Detailed description of the content idea';
COMMENT ON COLUMN content_ideas.topic_keywords IS 'Array of keywords/tags related to this content idea';
COMMENT ON COLUMN content_ideas.suggested_date IS 'Suggested date for publishing this content';
COMMENT ON COLUMN content_ideas.priority IS 'Priority level for content planning';
COMMENT ON COLUMN content_ideas.status IS 'Workflow status of the content idea';
COMMENT ON COLUMN content_ideas.generated_content_id IS 'ID of generated content when idea is approved and content is created';
