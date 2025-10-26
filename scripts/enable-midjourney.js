#!/usr/bin/env node
/**
 * [Oct 24, 2025 - 09:05] Quick script to enable Midjourney in ai_image_models table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uakfsxlsmmmpqsjjhlnb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2ZzeGxzbW1tcHFzampobG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5OTI3MiwiZXhwIjoyMDc1Mzc1MjcyfQ.7i62ZQIwPRqsxEGDgIQR4igPlvN11M5kEJXKE5Fe3UI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function enableMidjourney() {
  console.log('🔍 Checking AI models in database...\n');
  
  // Fetch all models
  const { data: allModels, error: fetchError } = await supabase
    .from('ai_image_models')
    .select('*')
    .order('display_order');

  if (fetchError) {
    console.error('❌ Failed to fetch models:', fetchError);
    process.exit(1);
  }

  console.log('📊 Current Models:');
  console.log('─'.repeat(80));
  allModels.forEach(model => {
    const status = model.enabled ? '✅ ENABLED' : '❌ DISABLED';
    console.log(`${status} | ${model.name.padEnd(25)} | ${model.provider.padEnd(15)} | Order: ${model.display_order}`);
  });
  console.log('─'.repeat(80));
  console.log(`Total: ${allModels.length} models\n`);

  // Find Midjourney models
  const midjourneyModels = allModels.filter(m => 
    m.name.toLowerCase().includes('midjourney') || 
    m.model_identifier.toLowerCase().includes('midjourney')
  );

  if (midjourneyModels.length === 0) {
    console.log('⚠️  No Midjourney models found in database!');
    console.log('💡 You may need to run the Eden AI seed script first.');
    process.exit(0);
  }

  console.log(`🎯 Found ${midjourneyModels.length} Midjourney model(s):\n`);
  midjourneyModels.forEach(m => {
    console.log(`   - ${m.name} (${m.provider})`);
    console.log(`     ID: ${m.id}`);
    console.log(`     Model Identifier: ${m.model_identifier}`);
    console.log(`     Currently: ${m.enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log('');
  });

  // Enable them
  console.log('🔄 Enabling Midjourney model(s)...\n');
  
  for (const model of midjourneyModels) {
    const { data, error } = await supabase
      .from('ai_image_models')
      .update({ enabled: true })
      .eq('id', model.id)
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to enable ${model.name}:`, error.message);
    } else {
      console.log(`✅ Enabled: ${data.name}`);
    }
  }

  console.log('\n🎉 Midjourney enabled successfully!');
  console.log('🔄 Refresh MediaPicker to see Midjourney in the list.\n');
}

enableMidjourney().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

