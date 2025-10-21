-- [2025-10-07] Multi-Scoped Image Library minimal schema

CREATE TYPE IF NOT EXISTS asset_scope AS ENUM ('project', 'user', 'organization');

CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scope asset_scope NOT NULL,
  organization_id UUID,
  project_id UUID,
  owner_user_id UUID,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  width INT,
  height INT,
  storage_path TEXT NOT NULL,
  checksum TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_scope ON assets(scope);
CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_user_id);

-- Basic RLS setup (relaxed for now; tighten later)
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assets_select_all ON assets;
CREATE POLICY assets_select_all ON assets FOR SELECT USING (true);
DROP POLICY IF EXISTS assets_insert_all ON assets;
CREATE POLICY assets_insert_all ON assets FOR INSERT WITH CHECK (true);


