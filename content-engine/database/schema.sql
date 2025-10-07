-- Marketing SaaS Platform - Content Engine Database Schema
-- This schema is designed for Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and user management
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    industry_preference VARCHAR(50) CHECK (industry_preference IN ('restaurant', 'property', 'agency')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content pieces table for storing generated content
CREATE TABLE content_pieces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('blog', 'social', 'email', 'ads')),
    industry VARCHAR(50) NOT NULL CHECK (industry IN ('restaurant', 'property', 'agency')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base table for industry-specific templates and guidelines
CREATE TABLE knowledge_base (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    industry VARCHAR(50) NOT NULL CHECK (industry IN ('restaurant', 'property', 'agency')),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('blog', 'social', 'email', 'ads')),
    template_name VARCHAR(255) NOT NULL,
    template_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content templates table for reusable content structures
CREATE TABLE content_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(50) NOT NULL CHECK (industry IN ('restaurant', 'property', 'agency')),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('blog', 'social', 'email', 'ads')),
    template_structure JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking table for monitoring AI API calls
CREATE TABLE api_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_type VARCHAR(50) NOT NULL, -- 'openai', 'dalle', etc.
    endpoint VARCHAR(255) NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10,4) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_content_pieces_user_id ON content_pieces(user_id);
CREATE INDEX idx_content_pieces_industry ON content_pieces(industry);
CREATE INDEX idx_content_pieces_content_type ON content_pieces(content_type);
CREATE INDEX idx_content_pieces_status ON content_pieces(status);
CREATE INDEX idx_content_pieces_created_at ON content_pieces(created_at);

CREATE INDEX idx_knowledge_base_industry ON knowledge_base(industry);
CREATE INDEX idx_knowledge_base_content_type ON knowledge_base(content_type);
CREATE INDEX idx_knowledge_base_active ON knowledge_base(is_active);

CREATE INDEX idx_content_templates_industry ON content_templates(industry);
CREATE INDEX idx_content_templates_content_type ON content_templates(content_type);
CREATE INDEX idx_content_templates_active ON content_templates(is_active);

CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Content pieces policies
CREATE POLICY "Users can view own content" ON content_pieces
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content" ON content_pieces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content" ON content_pieces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content" ON content_pieces
    FOR DELETE USING (auth.uid() = user_id);

-- Knowledge base is read-only for all authenticated users
CREATE POLICY "Authenticated users can view knowledge base" ON knowledge_base
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Content templates are read-only for all authenticated users
CREATE POLICY "Authenticated users can view templates" ON content_templates
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- API usage policies
CREATE POLICY "Users can view own API usage" ON api_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API usage" ON api_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_pieces_updated_at BEFORE UPDATE ON content_pieces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
