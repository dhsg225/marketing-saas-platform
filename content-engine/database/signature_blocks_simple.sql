-- Simple Signature Blocks Schema
CREATE TABLE IF NOT EXISTS signature_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('contact', 'disclaimer', 'social', 'cta', 'custom')),
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signature_blocks_project_id ON signature_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_signature_blocks_type ON signature_blocks(type);
CREATE INDEX IF NOT EXISTS idx_signature_blocks_is_default ON signature_blocks(is_default);
CREATE INDEX IF NOT EXISTS idx_signature_blocks_is_active ON signature_blocks(is_active);

-- Create a partial unique index to ensure only one default per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_blocks_unique_default 
ON signature_blocks(project_id) 
WHERE is_default = TRUE;
