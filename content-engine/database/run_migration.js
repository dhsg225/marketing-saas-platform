/* [2025-10-07 19:02 UTC] - Add preflight ALTERs for content_pieces.project_id and status */

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
    console.log('🔐 Connecting to database host:', process.env.SUPABASE_DB_HOST);

    console.log('🔧 Ensuring uuid-ossp extension exists...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    console.log('🔧 Running preflight ALTERs (before schema apply)...');
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS client_id UUID;');
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS organization_id UUID;');
    await client.query("ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'campaign';");
    await client.query("ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';");
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2);');
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS start_date DATE;');
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS end_date DATE;');
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS project_manager_id UUID;');
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS tags TEXT[];');
    await client.query('ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS settings JSONB;');

    // content_pieces alignment
    await client.query('ALTER TABLE IF EXISTS content_pieces ADD COLUMN IF NOT EXISTS project_id UUID;');
    await client.query("ALTER TABLE IF EXISTS content_pieces ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';");

    console.log('📦 Applying corrected hierarchy schema...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'corrected_hierarchy_schema.sql'), 'utf8');
    await client.query(schemaSql);

    console.log('🧭 Running migration...');
    const migrationSql = fs.readFileSync(path.join(__dirname, 'migrate_to_corrected_hierarchy.sql'), 'utf8');
    await client.query(migrationSql);

    console.log('✅ Migration complete. Verifying...');
    const counts = await client.query(`
      SELECT 'organizations' as table, COUNT(*) FROM organizations UNION ALL
      SELECT 'clients' as table, COUNT(*) FROM clients UNION ALL
      SELECT 'projects' as table, COUNT(*) FROM projects;
    `);
    console.table(counts.rows);

    const sample = await client.query(`
      SELECT o.name as organization_name, c.company_name as client_name, p.name as project_name, p.project_type, p.status
      FROM organizations o
      JOIN clients c ON c.organization_id = o.id
      JOIN projects p ON p.client_id = c.id
      ORDER BY o.name, c.company_name, p.name
      LIMIT 10;
    `);
    console.table(sample.rows);
  } catch (e) {
    console.error('❌ Migration failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
