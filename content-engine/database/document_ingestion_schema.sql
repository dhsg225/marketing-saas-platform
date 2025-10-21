-- Document Ingestion Schema
-- Stores AI-processed document data and extraction results

CREATE TABLE IF NOT EXISTS document_ingestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    document_type VARCHAR(50) NOT NULL CHECK (
        document_type IN (
            'content_calendar', 'campaign_brief', 'brand_guidelines', 
            'content_ideas', 'social_media_plan', 'marketing_strategy', 'general'
        )
    ),
    extracted_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'processing' CHECK (
        status IN ('processing', 'completed', 'failed', 'partial')
    ),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_ingestions_project ON document_ingestions(project_id);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_user ON document_ingestions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_type ON document_ingestions(document_type);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_status ON document_ingestions(status);
CREATE INDEX IF NOT EXISTS idx_document_ingestions_created ON document_ingestions(created_at);

-- GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_document_ingestions_data ON document_ingestions USING GIN (extracted_data);

-- Table for content items extracted from documents
CREATE TABLE IF NOT EXISTS extracted_content_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ingestion_id UUID NOT NULL REFERENCES document_ingestions(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL, -- Original item ID from extraction
    item_type VARCHAR(50) NOT NULL, -- content_calendar_item, campaign_brief_item, etc.
    title VARCHAR(500),
    description TEXT,
    content_data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for content items
CREATE INDEX IF NOT EXISTS idx_content_items_ingestion ON extracted_content_items(ingestion_id);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON extracted_content_items(item_type);
CREATE INDEX IF NOT EXISTS idx_content_items_data ON extracted_content_items USING GIN (content_data);

-- Table for mapping extracted content to system entities
CREATE TABLE IF NOT EXISTS content_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content_item_id UUID NOT NULL REFERENCES extracted_content_items(id) ON DELETE CASCADE,
    mapped_type VARCHAR(50) NOT NULL CHECK (
        mapped_type IN ('campaign', 'content_idea', 'social_post', 'task', 'event')
    ),
    mapped_id UUID, -- ID of the mapped entity in the system
    mapping_status VARCHAR(20) DEFAULT 'pending' CHECK (
        mapping_status IN ('pending', 'mapped', 'rejected', 'duplicate')
    ),
    mapping_confidence DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    mapping_notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for mappings
CREATE INDEX IF NOT EXISTS idx_content_mappings_item ON content_mappings(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_mappings_type ON content_mappings(mapped_type);
CREATE INDEX IF NOT EXISTS idx_content_mappings_status ON content_mappings(mapping_status);

-- Update triggers
CREATE OR REPLACE FUNCTION update_document_ingestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_ingestions_updated_at
    BEFORE UPDATE ON document_ingestions
    FOR EACH ROW
    EXECUTE FUNCTION update_document_ingestions_updated_at();

CREATE TRIGGER trigger_content_mappings_updated_at
    BEFORE UPDATE ON content_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_document_ingestions_updated_at();

-- Views for easy querying
CREATE OR REPLACE VIEW document_ingestion_summary AS
SELECT 
    di.id,
    di.project_id,
    p.name as project_name,
    di.user_id,
    u.name as user_name,
    di.file_name,
    di.document_type,
    di.status,
    di.created_at,
    di.updated_at,
    (di.extracted_data->>'totalItems')::INTEGER as total_items,
    di.extracted_data->'metadata'->>'dateRange' as date_range,
    di.extracted_data->'metadata'->'platforms' as platforms
FROM document_ingestions di
JOIN projects p ON di.project_id = p.id
JOIN users u ON di.user_id = u.id;

-- View for content items with ingestion context
CREATE OR REPLACE VIEW content_items_with_context AS
SELECT 
    eci.id,
    eci.ingestion_id,
    di.project_id,
    di.file_name,
    di.document_type,
    eci.item_id,
    eci.item_type,
    eci.title,
    eci.description,
    eci.content_data,
    eci.metadata,
    eci.created_at
FROM extracted_content_items eci
JOIN document_ingestions di ON eci.ingestion_id = di.id;

-- Comments
COMMENT ON TABLE document_ingestions IS 'Stores AI-processed document extraction results';
COMMENT ON TABLE extracted_content_items IS 'Individual content items extracted from documents';
COMMENT ON TABLE content_mappings IS 'Mappings between extracted content and system entities';

COMMENT ON COLUMN document_ingestions.document_type IS 'Type of document detected (content_calendar, campaign_brief, etc.)';
COMMENT ON COLUMN document_ingestions.extracted_data IS 'JSONB containing all extracted and structured data';
COMMENT ON COLUMN document_ingestions.status IS 'Processing status of the ingestion';
COMMENT ON COLUMN document_ingestions.processing_time_ms IS 'Time taken to process the document in milliseconds';

COMMENT ON COLUMN extracted_content_items.item_id IS 'Original ID from the document (e.g., row number)';
COMMENT ON COLUMN extracted_content_items.item_type IS 'Type of content item (content_calendar_item, campaign_brief_item, etc.)';
COMMENT ON COLUMN extracted_content_items.content_data IS 'Structured data for this specific content item';

COMMENT ON COLUMN content_mappings.mapped_type IS 'Type of system entity this content maps to';
COMMENT ON COLUMN content_mappings.mapped_id IS 'ID of the mapped entity in the system';
COMMENT ON COLUMN content_mappings.mapping_confidence IS 'Confidence score for the mapping (0.0 to 1.0)';
