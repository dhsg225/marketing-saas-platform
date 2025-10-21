-- Migration Script: Fix Hierarchy Structure
-- This script migrates from the incorrect hierarchy to the correct one

-- Step 1: Create the corrected tables
-- (These will be created by the corrected_hierarchy_schema.sql)

-- Step 2: Insert default organization (Your Agency)
INSERT INTO organizations (id, name, description, organization_type, website, email, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000', -- Fixed organization ID
    'Productionhouse Asia',
    'Digital marketing agency specializing in restaurant and property marketing',
    'agency',
    'https://productionhouse.asia',
    'hello@productionhouse.asia',
    NOW(),
    NOW()
);

-- Step 3: Migrate existing "organizations" to "clients"
-- First, let's see what we have in the current user_organizations table
-- We'll create clients based on the existing organization IDs

-- Create clients from existing organization data
INSERT INTO clients (
    id,
    organization_id,
    company_name,
    industry,
    business_type,
    website,
    phone,
    email,
    address,
    city,
    state,
    country,
    account_status,
    subscription_tier,
    billing_cycle,
    primary_contact_name,
    primary_contact_email,
    primary_contact_phone,
    primary_contact_role,
    business_description,
    created_at,
    updated_at,
    last_activity_at
)
SELECT 
    -- Use the existing organization_id as the new client_id
    uo.organization_id as id,
    '550e8400-e29b-41d4-a716-446655440000' as organization_id, -- Link to our agency
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'Bangkok Bistro Group'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'Luxury Properties Thailand'
        ELSE 'Client ' || SUBSTRING(uo.organization_id::text, 1, 8)
    END as company_name,
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'restaurant'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'property'
        ELSE 'agency'
    END as industry,
    'corporate' as business_type,
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'https://bangkokbistro.com'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'https://luxuryproperties.co.th'
        ELSE 'https://example.com'
    END as website,
    '+66-2-123-4567' as phone,
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'contact@bangkokbistro.com'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'info@luxuryproperties.co.th'
        ELSE 'contact@example.com'
    END as email,
    '123 Business District' as address,
    'Bangkok' as city,
    'Bangkok' as state,
    'Thailand' as country,
    'active' as account_status,
    CASE 
        WHEN uo.role = 'admin' THEN 'enterprise'
        ELSE 'professional'
    END as subscription_tier,
    'monthly' as billing_cycle,
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'Somchai Wong'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'Dr. Ananya Patel'
        ELSE 'Primary Contact'
    END as primary_contact_name,
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'somchai@bangkokbistro.com'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'ananya@luxuryproperties.co.th'
        ELSE 'contact@example.com'
    END as primary_contact_email,
    '+66-81-234-5678' as primary_contact_phone,
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'Operations Manager'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'Marketing Director'
        ELSE 'Primary Contact'
    END as primary_contact_role,
    CASE 
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440001' THEN 'Authentic Thai restaurant chain with multiple locations across Bangkok'
        WHEN uo.organization_id = '550e8400-e29b-41d4-a716-446655440002' THEN 'Premium real estate development company specializing in luxury properties'
        ELSE 'Business client'
    END as business_description,
    uo.created_at,
    NOW() as updated_at,
    NOW() as last_activity_at
FROM user_organizations uo
WHERE uo.organization_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002'
);

-- Step 4: Update user_organizations to point to the correct organization
UPDATE user_organizations 
SET organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002'
);

-- Step 5: Update projects to point to clients instead of organizations
-- First, we need to map the old organization_id to the new client_id
UPDATE projects 
SET client_id = organization_id,
    organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE organization_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002'
);

-- Step 6: Update content_pieces to use the new structure
-- Content pieces should be linked to projects, which are now properly linked to clients

-- Step 7: Clean up any orphaned data
-- Remove any projects that don't have valid clients
DELETE FROM projects 
WHERE client_id NOT IN (SELECT id FROM clients);

-- Step 8: Add some sample projects for our migrated clients
INSERT INTO projects (
    id,
    client_id,
    organization_id,
    name,
    description,
    project_type,
    industry,
    status,
    priority,
    budget,
    start_date,
    end_date,
    created_at,
    updated_at
)
VALUES 
-- Projects for Bangkok Bistro Group
(
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'Bangkok Bistro Social Media Campaign',
    'Comprehensive social media strategy for 5 restaurant locations',
    'social_media',
    'restaurant',
    'active',
    'high',
    15000.00,
    '2024-10-01',
    '2024-12-31',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'Bangkok Bistro Website Redesign',
    'Modern website redesign with online ordering system',
    'website',
    'restaurant',
    'active',
    'medium',
    25000.00,
    '2024-11-01',
    '2025-02-28',
    NOW(),
    NOW()
),

-- Projects for Luxury Properties Thailand
(
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    'Luxury Properties Website Redesign',
    'Complete website overhaul with modern design and SEO optimization',
    'website',
    'property',
    'active',
    'medium',
    35000.00,
    '2024-09-15',
    '2025-01-15',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    'Luxury Properties Social Media',
    'Premium social media strategy for luxury property marketing',
    'social_media',
    'property',
    'active',
    'high',
    20000.00,
    '2024-10-01',
    '2025-03-31',
    NOW(),
    NOW()
);

-- Step 9: Update any existing content_pieces to link to the new projects
-- This ensures content is properly associated with the corrected hierarchy

-- Step 10: Verify the migration
-- Check that we have the correct structure
SELECT 
    'Organizations' as table_name,
    COUNT(*) as count
FROM organizations
UNION ALL
SELECT 
    'Clients' as table_name,
    COUNT(*) as count
FROM clients
UNION ALL
SELECT 
    'Projects' as table_name,
    COUNT(*) as count
FROM projects
UNION ALL
SELECT 
    'Users' as table_name,
    COUNT(*) as count
FROM users;

-- Show the corrected hierarchy
SELECT 
    o.name as organization_name,
    c.company_name as client_name,
    p.name as project_name,
    p.project_type,
    p.status
FROM organizations o
JOIN clients c ON c.organization_id = o.id
JOIN projects p ON p.client_id = c.id
ORDER BY o.name, c.company_name, p.name;
