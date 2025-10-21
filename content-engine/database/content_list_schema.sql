-- [2025-10-18] - Content List Management System
-- This table stores content items organized by development stages
-- Supports drag-and-drop workflow between stages

CREATE TABLE IF NOT EXISTS content_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Basic content information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('post', 'video', 'ad', 'blog', 'email', 'story', 'reel')),
    
    -- Workflow stage
    stage VARCHAR(50) NOT NULL DEFAULT 'ideas' CHECK (stage IN (
        'ideas',           -- Unformed concepts, no assets yet
        'in_progress',     -- Actively being written or designed
        'assets_attached', -- Images or videos now linked
        'ready_to_publish', -- Finalized content
        'published'        -- Optional completed section
    )),
    
    -- Assignment and ownership
    assigned_user_id UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Content details
    content_text TEXT, -- The actual content when generated
    media_attachments JSONB DEFAULT '[]', -- Array of media file references
    metadata JSONB DEFAULT '{}', -- Additional content metadata
    
    -- Status tracking
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    completed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Order within stage (for drag-and-drop positioning)
    stage_order INTEGER DEFAULT 0
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_list_items_project_id ON content_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_content_list_items_stage ON content_list_items(stage);
CREATE INDEX IF NOT EXISTS idx_content_list_items_assigned_user ON content_list_items(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_content_list_items_created_by ON content_list_items(created_by);
CREATE INDEX IF NOT EXISTS idx_content_list_items_content_type ON content_list_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_list_items_priority ON content_list_items(priority);
CREATE INDEX IF NOT EXISTS idx_content_list_items_due_date ON content_list_items(due_date);
CREATE INDEX IF NOT EXISTS idx_content_list_items_stage_order ON content_list_items(stage, stage_order);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_content_list_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_content_list_items_updated_at
    BEFORE UPDATE ON content_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_content_list_items_updated_at();

-- Function to reorder items within a stage
CREATE OR REPLACE FUNCTION reorder_content_list_items(
    p_project_id UUID,
    p_stage VARCHAR(50),
    p_item_ids UUID[]
) RETURNS VOID AS $$
DECLARE
    i INTEGER;
    item_id UUID;
BEGIN
    -- Update the stage_order for each item in the provided order
    FOR i IN 1..array_length(p_item_ids, 1) LOOP
        item_id := p_item_ids[i];
        UPDATE content_list_items 
        SET stage_order = i * 10, updated_at = CURRENT_TIMESTAMP
        WHERE id = item_id 
        AND project_id = p_project_id 
        AND stage = p_stage;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to move item between stages
CREATE OR REPLACE FUNCTION move_content_list_item(
    p_item_id UUID,
    p_new_stage VARCHAR(50),
    p_new_order INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_stage VARCHAR(50);
    max_order INTEGER;
BEGIN
    -- Get current stage
    SELECT stage INTO current_stage 
    FROM content_list_items 
    WHERE id = p_item_id;
    
    IF current_stage IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If no new order specified, place at end of new stage
    IF p_new_order IS NULL THEN
        SELECT COALESCE(MAX(stage_order), 0) + 10 INTO max_order
        FROM content_list_items 
        WHERE project_id = (SELECT project_id FROM content_list_items WHERE id = p_item_id)
        AND stage = p_new_stage;
        
        p_new_order := max_order;
    END IF;
    
    -- Update the item
    UPDATE content_list_items 
    SET stage = p_new_stage, 
        stage_order = p_new_order,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_item_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
