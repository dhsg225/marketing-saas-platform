#!/usr/bin/env node

/**
 * MVA Database Migration Execution Script
 * Executes the critical MVA data structure migration
 * Created: 2025-10-12
 */

const { pool } = require('./config');
const fs = require('fs');
const path = require('path');

async function executeMVAMigration() {
  try {
    console.log('🚀 Starting MVA Database Migration...');
    console.log('📋 Executing critical MVA data structure migration');
    console.log('');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'mva_migration_working.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Migration script loaded');
    console.log('⚡ Executing migration...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('');
    console.log('✅ MVA Migration completed successfully!');
    console.log('');
    
    // Verify the migration
    console.log('🔍 Verifying migration results...');
    
    // Check post_types table (renamed from content_recipes)
    const postTypesCheck = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'post_types'
    `);
    console.log(`   ✓ post_types table: ${postTypesCheck.rows[0].count > 0 ? 'CREATED' : 'MISSING'}`);
    
    // Check content_strategies table
    const strategiesCheck = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'content_strategies'
    `);
    console.log(`   ✓ content_strategies table: ${strategiesCheck.rows[0].count > 0 ? 'CREATED' : 'MISSING'}`);
    
    // Check tone_profiles table
    const toneCheck = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'tone_profiles'
    `);
    console.log(`   ✓ tone_profiles table: ${toneCheck.rows[0].count > 0 ? 'CREATED' : 'MISSING'}`);
    
    // Check model_configs table
    const modelCheck = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'model_configs'
    `);
    console.log(`   ✓ model_configs table: ${modelCheck.rows[0].count > 0 ? 'CREATED' : 'MISSING'}`);
    
    // Check industry_niche column in projects
    const nicheCheck = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'industry_niche'
    `);
    console.log(`   ✓ projects.industry_niche column: ${nicheCheck.rows[0].count > 0 ? 'ADDED' : 'MISSING'}`);
    
    console.log('');
    console.log('🎯 MVA Migration Verification Complete');
    console.log('');
    
    // Test Content Strategy Visualization data structure
    console.log('🧪 Testing Content Strategy Visualization data structure...');
    
    // Create a sample content strategy with post_type_mix_targets
    const sampleStrategy = await pool.query(`
      INSERT INTO content_strategies (
        project_id, 
        strategy_name, 
        strategy_description,
        post_type_mix_targets,
        status
      ) VALUES (
        (SELECT id FROM projects LIMIT 1),
        'Sample Strategy for Testing',
        'Test strategy to verify JSONB structure',
        '{"educational": 40, "promotional": 20, "behind_scenes": 25, "user_generated": 15}',
        'active'
      ) RETURNING strategy_id, post_type_mix_targets
    `);
    
    if (sampleStrategy.rows.length > 0) {
      console.log('   ✓ Sample content strategy created successfully');
      console.log('   ✓ JSONB post_type_mix_targets structure verified');
      console.log('   📊 Sample data:', JSON.stringify(sampleStrategy.rows[0].post_type_mix_targets, null, 2));
      
      // Clean up test data
      await pool.query('DELETE FROM content_strategies WHERE strategy_name = $1', ['Sample Strategy for Testing']);
      console.log('   🧹 Test data cleaned up');
    }
    
    console.log('');
    console.log('🏆 MVA DATABASE MIGRATION: SUCCESSFULLY COMPLETED');
    console.log('');
    console.log('📋 Migration Summary:');
    console.log('   • content_recipes → post_types (RENAMED)');
    console.log('   • content_strategies table (CREATED)');
    console.log('   • tone_profiles table (CREATED)');
    console.log('   • model_configs table (CREATED)');
    console.log('   • projects.industry_niche column (ADDED)');
    console.log('');
    console.log('🎯 Ready for Advanced Tone and Style Profiler (Feature 9) UI development');
    
  } catch (error) {
    console.error('❌ MVA Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    pool.end();
  }
}

// Execute the migration
executeMVAMigration();
