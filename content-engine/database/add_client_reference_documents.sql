-- Add Client Reference Documents Table
-- Feature 6: Client Reference Document Repository

CREATE TABLE client_reference_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_category VARCHAR(50) DEFAULT 'general' CHECK (document_category IN (
        'menu', 'brand_guidelines', 'price_list', 'operational_guidelines', 
        'legal_documents', 'marketing_materials', 'reference_images', 'general'
    )),
    is_ai_accessible BOOLEAN DEFAULT true, -- Whether AI can use this for content generation
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_client_reference_documents_project_id ON client_reference_documents(project_id);
CREATE INDEX idx_client_reference_documents_category ON client_reference_documents(document_category);
CREATE INDEX idx_client_reference_documents_uploaded_by ON client_reference_documents(uploaded_by);
CREATE INDEX idx_client_reference_documents_ai_accessible ON client_reference_documents(is_ai_accessible);

-- Add RLS (Row Level Security) policies
ALTER TABLE client_reference_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for projects they have access to
CREATE POLICY "Users can view reference documents for their projects" ON client_reference_documents
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can insert documents for projects they have access to
CREATE POLICY "Users can insert reference documents for their projects" ON client_reference_documents
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        ) AND uploaded_by = auth.uid()
    );

-- Policy: Users can update documents they uploaded
CREATE POLICY "Users can update reference documents they uploaded" ON client_reference_documents
    FOR UPDATE USING (
        uploaded_by = auth.uid() AND
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policy: Users can delete documents they uploaded
CREATE POLICY "Users can delete reference documents they uploaded" ON client_reference_documents
    FOR DELETE USING (
        uploaded_by = auth.uid() AND
        project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE c.organization_id IN (
                SELECT organization_id FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_client_reference_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_reference_documents_updated_at
    BEFORE UPDATE ON client_reference_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_client_reference_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE client_reference_documents IS 'Stores client business documents and reference materials for each project';
COMMENT ON COLUMN client_reference_documents.document_category IS 'Category of document (menu, brand_guidelines, etc.)';
COMMENT ON COLUMN client_reference_documents.is_ai_accessible IS 'Whether AI can access this document for content generation';
COMMENT ON COLUMN client_reference_documents.file_path IS 'Server path to the uploaded file';
COMMENT ON COLUMN client_reference_documents.mime_type IS 'MIME type of the uploaded file';
