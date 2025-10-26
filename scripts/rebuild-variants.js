// [Oct 25, 2025 15:50] Rebuild variants object with BunnyCDN URLs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uakfsxlsmmmpqsjjhlnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2ZzeGxzbW1tcHFzampobG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5OTI3MiwiZXhwIjoyMDc1Mzc1MjcyfQ.7i62ZQIwPRqsxEGDgIQR4igPlvN11M5kEJXKE5Fe3UI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function rebuildVariants() {
  try {
    console.log('🔍 Finding assets with empty variants...');
    
    // Fetch all assets with BunnyCDN URLs and empty variants
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('id, file_name, url, cdn_url, file_size')
      .like('url', '%b-cdn.net%');
    
    if (fetchError) {
      console.error('❌ Error fetching assets:', fetchError);
      return;
    }
    
    console.log(`📊 Total BunnyCDN assets: ${assets.length}`);
    
    // Filter for assets with empty variants
    const assetsWithEmptyVariants = assets.filter(asset => 
      !asset.variants || Object.keys(asset.variants).length === 0
    );
    
    console.log(`🎯 Assets with empty variants to rebuild: ${assetsWithEmptyVariants.length}`);
    
    if (assetsWithEmptyVariants.length === 0) {
      console.log('✅ All variants already exist!');
      return;
    }
    
    // Update each asset to add variants pointing to BunnyCDN
    let successCount = 0;
    for (const asset of assetsWithEmptyVariants) {
      const bunnyUrl = asset.cdn_url || asset.url;
      
      // Create variants structure (all pointing to same BunnyCDN URL since we don't have resized versions)
      const variants = {
        original: {
          url: bunnyUrl,
          width: 1024,
          height: 1024,
          size: asset.file_size || 0,
          format: 'png'
        },
        large: {
          url: bunnyUrl,
          width: 1024,
          height: 1024,
          size: asset.file_size || 0,
          format: 'png'
        },
        medium: {
          url: bunnyUrl,
          width: 1024,
          height: 1024,
          size: asset.file_size || 0,
          format: 'png'
        },
        thumbnail: {
          url: bunnyUrl,
          width: 1024,
          height: 1024,
          size: asset.file_size || 0,
          format: 'png'
        }
      };
      
      const { error: updateError } = await supabase
        .from('assets')
        .update({ variants })
        .eq('id', asset.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${asset.file_name}:`, updateError);
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`   ✅ Updated ${successCount}/${assetsWithEmptyVariants.length}...`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Rebuild complete: ${successCount}/${assetsWithEmptyVariants.length} assets updated`);
    console.log('🎨 All variants now pointing to BunnyCDN!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Rebuild failed:', error);
  }
}

rebuildVariants();

