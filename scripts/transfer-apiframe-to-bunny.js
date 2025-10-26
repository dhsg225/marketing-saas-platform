// [Oct 25, 2025 14:35] Bulk transfer existing Apiframe images to BunnyCDN
const fetch = require('node-fetch');

const BUNNY_TRANSFER_URL = 'https://us-central1-marketing-saas-ai.cloudfunctions.net/bunny-transfer';
const SUPABASE_URL = 'https://uakfsxlsmmmpqsjjhlnb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2ZzeGxzbW1tcHFzampobG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5OTI3MiwiZXhwIjoyMDc1Mzc1MjcyfQ.7i62ZQIwPRqsxEGDgIQR4igPlvN11M5kEJXKE5Fe3UI';

async function transferApiframeImages() {
  try {
    console.log('🔍 Fetching all assets from Supabase...');
    
    // Fetch all assets
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/assets?select=id,file_name,url,project_id,organization_id&order=created_at.desc&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const assets = await response.json();
    console.log(`📊 Total assets in database: ${assets.length}`);
    
    // Filter for Apiframe assets
    const apiframeAssets = assets.filter(a => a.url && a.url.includes('apiframe'));
    console.log(`🎯 Apiframe assets to transfer: ${apiframeAssets.length}`);
    
    if (apiframeAssets.length === 0) {
      console.log('✅ All assets already on BunnyCDN!');
      return;
    }
    
    // Transfer each asset
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < apiframeAssets.length; i++) {
      const asset = apiframeAssets[i];
      console.log(`\n📤 [${i + 1}/${apiframeAssets.length}] Transferring: ${asset.file_name}`);
      console.log(`   Source: ${asset.url.substring(0, 60)}...`);
      
      try {
        const transferResponse = await fetch(BUNNY_TRANSFER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceUrl: asset.url,
            projectId: asset.project_id,
            assetId: asset.id,
            metadata: {
              migratedFrom: 'apiframe',
              migrationDate: new Date().toISOString(),
              originalAssetId: asset.id
            }
          })
        });
        
        const result = await transferResponse.json();
        
        if (result.success) {
          console.log(`   ✅ Success! BunnyCDN URL: ${result.cdnUrl.substring(0, 60)}...`);
          successCount++;
        } else {
          console.log(`   ❌ Failed: ${result.error || result.details}`);
          failCount++;
        }
        
        // Rate limit: wait 500ms between transfers
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Transfer Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total: ${apiframeAssets.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
transferApiframeImages();

