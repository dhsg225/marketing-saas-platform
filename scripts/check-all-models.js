#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = 'https://uakfsxlsmmmpqsjjhlnb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2ZzeGxzbW1tcHFzampobG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5OTI3MiwiZXhwIjoyMDc1Mzc1MjcyfQ.7i62ZQIwPRqsxEGDgIQR4igPlvN11M5kEJXKE5Fe3UI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAllModels() {
  const { data: allModels, error } = await supabase
    .from('ai_image_models')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('\n📊 ALL AI MODELS IN DATABASE:\n');
  console.log('═'.repeat(120));
  
  allModels.forEach(m => {
    const status = m.enabled ? '✅' : '❌';
    console.log(`${status} ${m.name.padEnd(30)} | Provider: ${m.provider.padEnd(15)} | ID: ${m.id}`);
    console.log(`   Model Identifier: ${m.model_identifier}`);
    console.log(`   Display Order: ${m.display_order} | Cost: $${m.cost_per_generation} | Time: ${m.estimated_time}s`);
    console.log('─'.repeat(120));
  });
  
  console.log(`\nTotal: ${allModels.length} models (${allModels.filter(m => m.enabled).length} enabled)\n`);
  
  // Check specifically for Apiframe
  const apiframeModels = allModels.filter(m => m.provider === 'apiframe' || m.model_identifier.includes('apiframe'));
  console.log(`🔍 Apiframe models: ${apiframeModels.length}`);
  apiframeModels.forEach(m => console.log(`   - ${m.name} (${m.id}): ${m.enabled ? 'ENABLED' : 'DISABLED'}`));
}

checkAllModels().catch(console.error);

