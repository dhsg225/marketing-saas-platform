#!/usr/bin/env node

/**
 * ============================================================================
 * Apply Eden AI Models Schema to Supabase
 * ============================================================================
 * Purpose: Helper script to apply schema and seed data to Supabase database
 * Usage: node apply-eden-ai-schema.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           Eden AI Models - Database Setup Script              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
`);

// Read SQL files
const schemaPath = path.join(__dirname, 'eden-ai-models-schema.sql');
const seedPath = path.join(__dirname, 'seed-eden-ai-models.sql');

console.log(`${colors.blue}📂 Reading SQL files...${colors.reset}`);

let schemaSQL, seedSQL;

try {
  schemaSQL = fs.readFileSync(schemaPath, 'utf8');
  console.log(`${colors.green}   ✅ Schema loaded: ${schemaPath}${colors.reset}`);
  
  seedSQL = fs.readFileSync(seedPath, 'utf8');
  console.log(`${colors.green}   ✅ Seed data loaded: ${seedPath}${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}   ❌ Error reading SQL files:${colors.reset}`, error.message);
  process.exit(1);
}

console.log(`
${colors.yellow}╔════════════════════════════════════════════════════════════════╗
║                     MANUAL SETUP REQUIRED                      ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Please follow these steps to apply the schema:${colors.reset}

${colors.cyan}Step 1: Open Supabase SQL Editor${colors.reset}
  → Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

${colors.cyan}Step 2: Create New Query${colors.reset}
  → Click "New Query" button

${colors.cyan}Step 3: Run Schema Migration${colors.reset}
  → Copy and paste the contents of:
    ${colors.green}${schemaPath}${colors.reset}
  → Click "Run" or press Cmd/Ctrl + Enter

${colors.cyan}Step 4: Run Seed Data${colors.reset}
  → Create another new query
  → Copy and paste the contents of:
    ${colors.green}${seedPath}${colors.reset}
  → Click "Run" or press Cmd/Ctrl + Enter

${colors.yellow}════════════════════════════════════════════════════════════════${colors.reset}

${colors.bright}📋 Quick Copy-Paste Instructions:${colors.reset}

${colors.cyan}For macOS/Linux:${colors.reset}
  cat "${schemaPath}" | pbcopy
  ${colors.blue}(Schema is now in clipboard - paste in Supabase SQL Editor)${colors.reset}

  cat "${seedPath}" | pbcopy
  ${colors.blue}(Seed data is now in clipboard - paste in Supabase SQL Editor)${colors.reset}

${colors.cyan}For Windows PowerShell:${colors.reset}
  Get-Content "${schemaPath}" | Set-Clipboard
  Get-Content "${seedPath}" | Set-Clipboard

${colors.yellow}════════════════════════════════════════════════════════════════${colors.reset}

${colors.bright}📊 What Will Be Created:${colors.reset}

${colors.green}Tables:${colors.reset}
  ✅ ai_image_models           - 10 curated AI models
  ✅ ai_image_generation_logs  - Usage tracking

${colors.green}Views:${colors.reset}
  ✅ v_popular_ai_models       - Analytics view
  ✅ v_daily_ai_usage          - Daily stats view

${colors.green}RLS Policies:${colors.reset}
  ✅ Public can view enabled models
  ✅ Authenticated can view all models
  ✅ Service role can manage models
  ✅ Users can view own logs

${colors.green}Default Enabled Models:${colors.reset}
  1️⃣  DALL-E 3 (OpenAI)         - $0.040/image, ~15s
  2️⃣  Stable Diffusion XL        - $0.020/image, ~10s
  3️⃣  Midjourney (Eden AI)       - $0.050/image, ~30s
  4️⃣  Leonardo AI                - $0.025/image, ~15s
  5️⃣  SDXL (Replicate)           - $0.015/image, ~12s

${colors.yellow}════════════════════════════════════════════════════════════════${colors.reset}

${colors.bright}🔐 Environment Variables Needed:${colors.reset}

Add this to your Google Cloud Functions:
  ${colors.cyan}EDENAI_API_KEY${colors.reset} = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

${colors.yellow}════════════════════════════════════════════════════════════════${colors.reset}

${colors.bright}✅ Verification Queries:${colors.reset}

After running both SQL scripts, verify with:

${colors.cyan}-- Check enabled models
SELECT id, name, provider, enabled, cost_per_generation 
FROM ai_image_models 
WHERE enabled = true 
ORDER BY display_order;${colors.reset}

${colors.cyan}-- View all models
SELECT * FROM ai_image_models ORDER BY display_order;${colors.reset}

${colors.cyan}-- Check analytics views
SELECT * FROM v_popular_ai_models;${colors.reset}

${colors.yellow}════════════════════════════════════════════════════════════════${colors.reset}

${colors.bright}🎯 Next Steps After Database Setup:${colors.reset}

  1. Update ai-models Google Cloud Function to query database
  2. Create ai-image-generation-edenai GCF
  3. Update MediaPicker component
  4. Build admin UI for model management

${colors.green}Ready to proceed? Follow the steps above! 🚀${colors.reset}

`);

// Optionally output the SQL to console for easy copying
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question(`${colors.cyan}Would you like to see the SQL output here? (y/n): ${colors.reset}`, (answer) => {
  if (answer.toLowerCase() === 'y') {
    console.log(`\n${colors.bright}${colors.green}═══════════ SCHEMA SQL ═══════════${colors.reset}\n`);
    console.log(schemaSQL);
    console.log(`\n${colors.bright}${colors.green}═══════════ SEED DATA SQL ═══════════${colors.reset}\n`);
    console.log(seedSQL);
  }
  
  console.log(`\n${colors.green}✅ Setup script complete!${colors.reset}\n`);
  readline.close();
});

