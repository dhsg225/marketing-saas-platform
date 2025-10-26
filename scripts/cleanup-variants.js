// [Oct 25, 2025 15:35] Clean up Apiframe URLs from variants field
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uakfsxlsmmmpqsjjhlnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2ZzeGxzbW1tcHFzampobG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5OTI3MiwiZXhwIjoyMDc1Mzc1MjcyfQ.7i62ZQIwPRqsxEGDgIQR4igPlvN11M5kEJXKE5Fe3UI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupVariants() {
  try {
    console.log('🔍 Finding assets with BunnyCDN URLs and Apiframe variants...');
    
    // Fetch all assets with BunnyCDN URLs
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('id, file_name, url, variants')
      .like('url', '%b-cdn.net%');
    
    if (fetchError) {
      console.error('❌ Error fetching assets:', fetchError);
      return;
    }
    
    console.log(`📊 Total BunnyCDN assets: ${assets.length}`);
    
    // Filter for assets with Apiframe URLs in variants
    const assetsWithApiframeVariants = assets.filter(asset => 
      asset.variants && JSON.stringify(asset.variants).includes('apiframe')
    );
    
    console.log(`🎯 Assets with Apiframe variants to clean: ${assetsWithApiframeVariants.length}`);
    
    if (assetsWithApiframeVariants.length === 0) {
      console.log('✅ All variants already clean!');
      return;
    }
    
    // Update each asset to remove variants
    let successCount = 0;
    for (const asset of assetsWithApiframeVariants) {
      const { error: updateError } = await supabase
        .from('assets')
        .update({ variants: {} })
        .eq('id', asset.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${asset.file_name}:`, updateError);
      } else {
        successCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Cleanup complete: ${successCount}/${assetsWithApiframeVariants.length} assets updated`);
    console.log('🐰 All images now using BunnyCDN URLs!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupVariants();

