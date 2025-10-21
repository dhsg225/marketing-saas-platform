-- [2025-10-20] - Update Content Workflow for Two-Stage Approval
-- Separates concept approval from publish approval

-- Add new approval fields to content_ideas table
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS concept_approved_at TIMESTAMP;
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS concept_approved_by VARCHAR(255);
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS publish_approved_at TIMESTAMP;
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS publish_approved_by VARCHAR(255);

-- Update existing status values to match new workflow
-- 'approved' becomes 'concept_approved' for clarity
UPDATE content_ideas 
SET status = 'concept_approved' 
WHERE status = 'approved';

-- Add new status values
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in transaction, so we'll use text
-- The status field should support: 'draft', 'concept_approved', 'in_development', 'ready_to_publish', 'published', 'cancelled'

-- Add comments for clarity
COMMENT ON COLUMN content_ideas.concept_approved_at IS 'When the client approved the concept/topic';
COMMENT ON COLUMN content_ideas.concept_approved_by IS 'Who approved the concept (user ID)';
COMMENT ON COLUMN content_ideas.publish_approved_at IS 'When the client approved for publishing';
COMMENT ON COLUMN content_ideas.publish_approved_by IS 'Who approved for publishing (user ID)';


