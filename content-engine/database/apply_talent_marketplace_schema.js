// [October 15, 2025] - Apply Talent Marketplace Schema Migration
// Purpose: Create complete marketplace system for Feature 5

const fs = require('fs');
const path = require('path');
const { pool } = require('./config');

async function applyTalentMarketplaceSchema() {
  console.log('🚀 Starting Talent Marketplace schema migration...\n');
  console.log('📋 This will create 14 tables for the complete marketplace system:\n');
  console.log('   - Talent Profiles & Portfolio');
  console.log('   - Booking System with Escrow');
  console.log('   - Stripe Payment Integration');
  console.log('   - Messaging System');
  console.log('   - Reviews & Ratings');
  console.log('   - Dispute Resolution');
  console.log('   - Invoice Generation');
  console.log('   - Tax Documentation (1099)');
  console.log('   - Earnings Tracking\n');

  try {
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, 'talent_marketplace_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    console.log('📝 Executing schema...');
    await pool.query(schemaSql);
    console.log('✅ Schema executed successfully\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'talent_%' OR table_name LIKE 'booking_%' OR table_name LIKE 'tax_documents' OR table_name = 'platform_fees' OR table_name = 'dispute_responses'
      ORDER BY table_name;
    `);

    if (tableCheck.rows.length > 0) {
      console.log(`✅ ${tableCheck.rows.length} tables created:`);
      tableCheck.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
      console.log('');
    } else {
      console.log('❌ Table verification failed - no tables found\n');
      process.exit(1);
    }

    // Check sequences
    console.log('🔍 Verifying sequences...');
    const sequenceCheck = await pool.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_name IN ('booking_number_seq', 'invoice_number_seq', 'dispute_number_seq');
    `);

    if (sequenceCheck.rows.length > 0) {
      console.log(`✅ ${sequenceCheck.rows.length} sequences created:`);
      sequenceCheck.rows.forEach(seq => {
        console.log(`   - ${seq.sequence_name}`);
      });
      console.log('');
    }

    // Check indexes
    console.log('🔍 Verifying indexes...');
    const indexCheck = await pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (tablename LIKE 'talent_%' OR tablename LIKE 'booking_%' OR tablename = 'tax_documents' OR tablename = 'platform_fees')
      ORDER BY tablename, indexname;
    `);

    if (indexCheck.rows.length > 0) {
      console.log(`✅ ${indexCheck.rows.length} indexes created`);
      
      // Group by table
      const indexesByTable = {};
      indexCheck.rows.forEach(idx => {
        if (!indexesByTable[idx.tablename]) {
          indexesByTable[idx.tablename] = [];
        }
        indexesByTable[idx.tablename].push(idx.indexname);
      });

      Object.keys(indexesByTable).sort().forEach(table => {
        console.log(`   ${table}: ${indexesByTable[table].length} indexes`);
      });
      console.log('');
    }

    // Check triggers
    console.log('🔍 Verifying triggers...');
    const triggerCheck = await pool.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND (event_object_table LIKE 'talent_%' OR event_object_table LIKE 'booking_%' OR event_object_table = 'tax_documents' OR event_object_table = 'platform_fees')
      ORDER BY event_object_table, trigger_name;
    `);

    if (triggerCheck.rows.length > 0) {
      console.log(`✅ ${triggerCheck.rows.length} triggers created:`);
      const triggersByTable = {};
      triggerCheck.rows.forEach(trg => {
        if (!triggersByTable[trg.event_object_table]) {
          triggersByTable[trg.event_object_table] = [];
        }
        triggersByTable[trg.event_object_table].push(trg.trigger_name);
      });

      Object.keys(triggersByTable).sort().forEach(table => {
        console.log(`   ${table}: ${triggersByTable[table].length} triggers`);
      });
      console.log('');
    }

    // Show table details for key tables
    console.log('📊 Key Table Details:\n');

    const keyTables = [
      'talent_profiles',
      'talent_bookings',
      'booking_payments',
      'talent_invoices',
      'talent_reviews',
      'talent_disputes'
    ];

    for (const tableName of keyTables) {
      const columnCheck = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      if (columnCheck.rows.length > 0) {
        console.log(`   📋 ${tableName}: ${columnCheck.rows.length} columns`);
      }
    }

    console.log('\n✅ ✅ ✅ Talent Marketplace schema migration completed successfully! ✅ ✅ ✅\n');
    console.log('📊 Migration Summary:');
    console.log(`   - Tables: ${tableCheck.rows.length}`);
    console.log(`   - Indexes: ${indexCheck.rows.length}`);
    console.log(`   - Triggers: ${triggerCheck.rows.length}`);
    console.log(`   - Sequences: ${sequenceCheck.rows.length}`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Set up Stripe Connect account');
    console.log('   2. Create backend API routes for talent profiles');
    console.log('   3. Build booking request workflow');
    console.log('   4. Integrate Stripe payment processing');
    console.log('   5. Create frontend UI for marketplace\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
applyTalentMarketplaceSchema();

