// [2025-10-07] Apply assets schema safely (works on Supabase/Postgres)
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: process.env.SUPABASE_DB_PORT || 5432,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Ensure extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Ensure enum type exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_scope') THEN
          CREATE TYPE asset_scope AS ENUM ('project','user','organization');
        END IF;
      END $$;
    `);

    // Create table if missing
    await client.query(`
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
    `);

    // Indexes & RLS
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_assets_scope ON assets(scope);
      CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(organization_id);
      CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
      CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_user_id);
      ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS assets_select_all ON assets;
      CREATE POLICY assets_select_all ON assets FOR SELECT USING (true);
      DROP POLICY IF EXISTS assets_insert_all ON assets;
      CREATE POLICY assets_insert_all ON assets FOR INSERT WITH CHECK (true);
    `);

    await client.query('COMMIT');
    console.log('✅ Assets schema applied');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to apply assets schema:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();


