#!/usr/bin/env node

/**
 * Apply Prompt Refinement Schema to Supabase
 * This script applies the AI-powered image prompt refinement database schema
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Applying AI Prompt Refinement Schema to Supabase...\n');

// Read the schema file
const schemaPath = path.join(__dirname, 'database', 'prompt-refinement-schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

console.log('📋 Schema file found:', schemaPath);
console.log('📏 Schema size:', schemaContent.length, 'characters');
console.log('\n📝 Schema Preview (first 500 characters):');
console.log('─'.repeat(50));
console.log(schemaContent.substring(0, 500) + '...');
console.log('─'.repeat(50));

console.log('\n🎯 Next Steps:');
console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
console.log('2. Select your project: uakfsxlsmmmpqsjjhlnb');
console.log('3. Go to SQL Editor');
console.log('4. Copy and paste the following schema:');
console.log('\n' + '='.repeat(60));
console.log(schemaContent);
console.log('='.repeat(60));

console.log('\n✅ Schema ready to apply!');
console.log('\n🔧 After applying the schema, verify these tables were created:');
console.log('- prompt_refinement_sessions');
console.log('- prompt_feedback');
console.log('- prompt_iterations');
console.log('- image_generation_results');
console.log('- prompt_comparisons');

console.log('\n🚀 Once schema is applied, we can proceed to deploy the Google Cloud Function!');
