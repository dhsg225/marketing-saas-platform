-- ========================================
-- INTERN MODULE DATABASE SCHEMA
-- Phase 1: Supabase PostgreSQL Schema
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- INTERNS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS interns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Active', 'Exited', 'Rejected')),
    assigned_topic TEXT NULL CHECK (assigned_topic IN ('auto', 'health', 'tech', 'finance', 'lifestyle', 'education', 'food', 'travel')),
    start_date DATE NULL,
    end_date DATE NULL,
    agreement_signed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one intern record per user
    UNIQUE(user_id)
);

-- ========================================
-- INTERN DOCUMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS intern_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('Institution Letter', 'Behavior Agreement', 'ID Document', 'Resume', 'Portfolio', 'Other')),
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_interns_status ON interns(status);
CREATE INDEX IF NOT EXISTS idx_interns_assigned_topic ON interns(assigned_topic);
CREATE INDEX IF NOT EXISTS idx_interns_application_date ON interns(application_date);
CREATE INDEX IF NOT EXISTS idx_intern_documents_intern_id ON intern_documents(intern_id);
CREATE INDEX IF NOT EXISTS idx_intern_documents_type ON intern_documents(document_type);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interns_updated_at 
    BEFORE UPDATE ON interns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on both tables
ALTER TABLE interns ENABLE ROW LEVEL SECURITY;
ALTER TABLE intern_documents ENABLE ROW LEVEL SECURITY;

-- Interns can view their own record
CREATE POLICY "Interns can view own record" ON interns
    FOR SELECT USING (auth.uid() = user_id);

-- Super admins can view all intern records
CREATE POLICY "Super admins can view all interns" ON interns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

-- Interns can update their own agreement status
CREATE POLICY "Interns can update agreement" ON interns
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Interns can view own documents" ON intern_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM interns 
            WHERE interns.id = intern_documents.intern_id 
            AND interns.user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can view all documents" ON intern_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

-- ========================================
-- STORAGE BUCKET SETUP
-- ========================================

-- Create storage bucket for intern documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('intern-docs', 'intern-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for intern documents
CREATE POLICY "Interns can upload own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'intern-docs' 
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

CREATE POLICY "Interns can view own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'intern-docs' 
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

CREATE POLICY "Super admins can manage all documents" ON storage.objects
    FOR ALL USING (
        bucket_id = 'intern-docs' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
        )
    );

-- ========================================
-- SAMPLE DATA (Optional - for testing)
-- ========================================

-- Uncomment the following lines to insert sample data for testing
/*
-- Sample intern records
INSERT INTO interns (user_id, status, assigned_topic, agreement_signed) VALUES
    (auth.uid(), 'Applied', 'tech', false),
    (auth.uid(), 'Active', 'health', true);
*/

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get intern statistics
CREATE OR REPLACE FUNCTION get_intern_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_interns', COUNT(*),
        'applied_count', COUNT(*) FILTER (WHERE status = 'Applied'),
        'active_count', COUNT(*) FILTER (WHERE status = 'Active'),
        'exited_count', COUNT(*) FILTER (WHERE status = 'Exited'),
        'rejected_count', COUNT(*) FILTER (WHERE status = 'Rejected')
    ) INTO result
    FROM interns;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get interns by status
CREATE OR REPLACE FUNCTION get_interns_by_status(intern_status TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    application_date TIMESTAMPTZ,
    status TEXT,
    assigned_topic TEXT,
    start_date DATE,
    end_date DATE,
    agreement_signed BOOLEAN,
    document_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.user_id,
        au.email,
        i.application_date,
        i.status,
        i.assigned_topic,
        i.start_date,
        i.end_date,
        i.agreement_signed,
        COUNT(id.id)::INTEGER as document_count
    FROM interns i
    LEFT JOIN auth.users au ON au.id = i.user_id
    LEFT JOIN intern_documents id ON id.intern_id = i.id
    WHERE (intern_status IS NULL OR i.status = intern_status)
    GROUP BY i.id, i.user_id, au.email, i.application_date, i.status, i.assigned_topic, i.start_date, i.end_date, i.agreement_signed
    ORDER BY i.application_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE interns IS 'Stores intern application and status information';
COMMENT ON TABLE intern_documents IS 'Stores references to uploaded documents for each intern';

COMMENT ON COLUMN interns.status IS 'Current status: Applied, Active, Exited, Rejected';
COMMENT ON COLUMN interns.assigned_topic IS 'Content vertical assignment: auto, health, tech, finance, lifestyle, education, food, travel';
COMMENT ON COLUMN intern_documents.document_type IS 'Type of document: Institution Letter, Behavior Agreement, ID Document, Resume, Portfolio, Other';

-- ========================================
-- SCHEMA COMPLETE
-- ========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON interns TO authenticated;
GRANT ALL ON intern_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_intern_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_interns_by_status(TEXT) TO authenticated;

-- Success message
SELECT 'Intern Module Schema Created Successfully!' as status;

