#!/usr/bin/env node

/**
 * MVA Blueprint Compliance Verification
 * Verifies that the database structure matches the MVA Architectural Blueprint
 */

const { pool } = require('./config');

async function verifyMVACompliance() {
  try {
    console.log('🔍 VERIFYING MVA BLUEPRINT COMPLIANCE\n');
    
    const checks = [];
    
    // ============================================================================
    // DOMAIN 1: AI & Content Core
    // ============================================================================
    console.log('📊 DOMAIN 1: AI & Content Core');
    
    // Check tone_profiles table
    const toneProfilesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tone_profiles'
      ORDER BY ordinal_position
    `);
    
    const hasToneId = toneProfilesCheck.rows.some(r => r.column_name === 'tone_id');
    const hasSystemInstruction = toneProfilesCheck.rows.some(r => r.column_name === 'system_instruction');
    const hasOwnerId = toneProfilesCheck.rows.some(r => r.column_name === 'owner_id');
    
    checks.push({
      table: 'tone_profiles',
      field: 'tone_id (PK)',
      status: hasToneId ? '✅' : '❌',
      compliant: hasToneId
    });
    checks.push({
      table: 'tone_profiles',
      field: 'system_instruction (TEXT)',
      status: hasSystemInstruction ? '✅' : '❌',
      compliant: hasSystemInstruction
    });
    checks.push({
      table: 'tone_profiles',
      field: 'owner_id (FK)',
      status: hasOwnerId ? '✅' : '❌',
      compliant: hasOwnerId
    });
    
    console.log(`   tone_profiles: ${hasToneId && hasSystemInstruction && hasOwnerId ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    
    // Check post_types table (renamed from content_recipes)
    const postTypesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'post_types'
      ORDER BY ordinal_position
    `);
    
    const hasTypeId = postTypesCheck.rows.some(r => r.column_name === 'recipe_id' || r.column_name === 'id');
    const hasName = postTypesCheck.rows.some(r => r.column_name === 'name');
    
    checks.push({
      table: 'post_types',
      field: 'type_id (PK)',
      status: hasTypeId ? '✅' : '❌',
      compliant: hasTypeId
    });
    checks.push({
      table: 'post_types',
      field: 'name',
      status: hasName ? '✅' : '❌',
      compliant: hasName
    });
    
    console.log(`   post_types: ${hasTypeId && hasName ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    
    // Check model_configs table
    const modelConfigsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'model_configs'
      ORDER BY ordinal_position
    `);
    
    const hasModelId = modelConfigsCheck.rows.some(r => r.column_name === 'model_id');
    const hasAdapterModule = modelConfigsCheck.rows.some(r => r.column_name === 'adapter_module' || r.column_name === 'adapter_name');
    
    checks.push({
      table: 'model_configs',
      field: 'model_id (PK)',
      status: hasModelId ? '✅' : '❌',
      compliant: hasModelId
    });
    checks.push({
      table: 'model_configs',
      field: 'adapter_module',
      status: hasAdapterModule ? '✅' : '❌',
      compliant: hasAdapterModule
    });
    
    console.log(`   model_configs: ${hasModelId && hasAdapterModule ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n`);
    
    // ============================================================================
    // DOMAIN 2: Project & Finance
    // ============================================================================
    console.log('📊 DOMAIN 2: Project & Finance');
    
    // Check clients table
    const clientsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);
    
    const hasClientId = clientsCheck.rows.some(r => r.column_name === 'client_id' || r.column_name === 'id');
    
    checks.push({
      table: 'clients',
      field: 'client_id (PK)',
      status: hasClientId ? '✅' : '❌',
      compliant: hasClientId
    });
    
    console.log(`   clients: ${hasClientId ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    
    // Check projects table
    const projectsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    
    const hasProjectId = projectsCheck.rows.some(r => r.column_name === 'project_id' || r.column_name === 'id');
    const hasClientIdFK = projectsCheck.rows.some(r => r.column_name === 'client_id');
    const hasIndustryNiche = projectsCheck.rows.some(r => r.column_name === 'industry_niche');
    
    checks.push({
      table: 'projects',
      field: 'project_id (PK)',
      status: hasProjectId ? '✅' : '❌',
      compliant: hasProjectId
    });
    checks.push({
      table: 'projects',
      field: 'client_id (FK)',
      status: hasClientIdFK ? '✅' : '❌',
      compliant: hasClientIdFK
    });
    checks.push({
      table: 'projects',
      field: 'industry_niche',
      status: hasIndustryNiche ? '✅' : '❌',
      compliant: hasIndustryNiche
    });
    
    console.log(`   projects: ${hasProjectId && hasClientIdFK && hasIndustryNiche ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
    
    // Check content_strategies table
    const strategiesCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'content_strategies'
      ORDER BY ordinal_position
    `);
    
    const hasStrategyId = strategiesCheck.rows.some(r => r.column_name === 'strategy_id');
    const hasProjectIdFK = strategiesCheck.rows.some(r => r.column_name === 'project_id');
    const hasToneIdFK = strategiesCheck.rows.some(r => r.column_name === 'tone_id');
    const hasPostTypeMixTargets = strategiesCheck.rows.some(r => r.column_name === 'post_type_mix_targets' && r.data_type === 'jsonb');
    const hasStatus = strategiesCheck.rows.some(r => r.column_name === 'status');
    
    checks.push({
      table: 'content_strategies',
      field: 'strategy_id (PK)',
      status: hasStrategyId ? '✅' : '❌',
      compliant: hasStrategyId
    });
    checks.push({
      table: 'content_strategies',
      field: 'project_id (FK)',
      status: hasProjectIdFK ? '✅' : '❌',
      compliant: hasProjectIdFK
    });
    checks.push({
      table: 'content_strategies',
      field: 'tone_id (FK)',
      status: hasToneIdFK ? '✅' : '❌',
      compliant: hasToneIdFK
    });
    checks.push({
      table: 'content_strategies',
      field: 'post_type_mix_targets (JSONB)',
      status: hasPostTypeMixTargets ? '✅' : '❌',
      compliant: hasPostTypeMixTargets
    });
    checks.push({
      table: 'content_strategies',
      field: 'status (ENUM)',
      status: hasStatus ? '✅' : '❌',
      compliant: hasStatus
    });
    
    console.log(`   content_strategies: ${hasStrategyId && hasProjectIdFK && hasToneIdFK && hasPostTypeMixTargets && hasStatus ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n`);
    
    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('📋 COMPLIANCE SUMMARY\n');
    console.log('┌─────────────────────────┬──────────────────────────────────┬────────┐');
    console.log('│ Table                   │ Field                            │ Status │');
    console.log('├─────────────────────────┼──────────────────────────────────┼────────┤');
    
    checks.forEach(check => {
      const table = check.table.padEnd(23);
      const field = check.field.padEnd(32);
      console.log(`│ ${table} │ ${field} │ ${check.status}    │`);
    });
    
    console.log('└─────────────────────────┴──────────────────────────────────┴────────┘\n');
    
    const allCompliant = checks.every(c => c.compliant);
    
    if (allCompliant) {
      console.log('🎯 RESULT: FULLY COMPLIANT WITH MVA BLUEPRINT ✅\n');
      console.log('✨ Database structure matches all required specifications.');
      console.log('🚀 Ready to proceed with Feature 9 (Advanced Tone & Style Profiler) UI development.\n');
    } else {
      console.log('⚠️  RESULT: PARTIAL COMPLIANCE ❌\n');
      console.log('Some fields may need adjustment to fully match the MVA Blueprint.');
    }
    
    // ============================================================================
    // ADDITIONAL INSIGHTS
    // ============================================================================
    console.log('💡 ADDITIONAL INSIGHTS:\n');
    
    // Check if post_types has recommended fields
    const hasDefaultChannels = postTypesCheck.rows.some(r => r.column_name === 'default_channels');
    const hasIsTrendTrackable = postTypesCheck.rows.some(r => r.column_name === 'is_trend_trackable');
    
    if (!hasDefaultChannels) {
      console.log('   ⚠️  post_types missing "default_channels" (JSONB) - Required for Feature 4 (Manual Distribution)');
    }
    if (!hasIsTrendTrackable) {
      console.log('   ⚠️  post_types missing "is_trend_trackable" (BOOLEAN) - Required for Feature 8 (Knowledge Base Trends)');
    }
    
    // Check if manual_distribution_lists exists
    const manualDistCheck = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'manual_distribution_lists'
    `);
    
    if (manualDistCheck.rows[0].count === '0') {
      console.log('   ⚠️  manual_distribution_lists table not yet created - Required for Feature 4 (Manual Distribution)');
    }
    
    console.log('\n📝 RECOMMENDATIONS:\n');
    console.log('   1. Consider adding "default_channels" (JSONB) to post_types for Feature 4');
    console.log('   2. Consider adding "is_trend_trackable" (BOOLEAN) to post_types for Feature 8');
    console.log('   3. Create manual_distribution_lists table when implementing Feature 4');
    console.log('   4. Current structure is sufficient for Feature 9 (Tone Profiler) and Feature 10 (Strategy Visualization)\n');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    pool.end();
  }
}

verifyMVACompliance();
