-- Signature Blocks Schema
-- This table stores standardized signature blocks for projects

CREATE TABLE IF NOT EXISTS signature_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('contact', 'disclaimer', 'social', 'cta', 'custom')),
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one default signature block per project (handled by partial unique index below)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signature_blocks_project_id ON signature_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_signature_blocks_type ON signature_blocks(type);
CREATE INDEX IF NOT EXISTS idx_signature_blocks_is_default ON signature_blocks(is_default);
CREATE INDEX IF NOT EXISTS idx_signature_blocks_is_active ON signature_blocks(is_active);

-- Create a partial unique index to ensure only one default per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_blocks_unique_default 
ON signature_blocks(project_id) 
WHERE is_default = TRUE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_signature_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_signature_blocks_updated_at
    BEFORE UPDATE ON signature_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_signature_blocks_updated_at();

-- Sample signature blocks can be inserted via the API
