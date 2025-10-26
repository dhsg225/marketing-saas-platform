#!/usr/bin/env node
/**
 * [Oct 24, 2025 - 08:55] Migration Script: Transfer all Apiframe images to BunnyCDN
 * This script:
 * 1. Fetches all assets from Supabase with Apiframe URLs
 * 2. Downloads each image from Apiframe
 * 3. Uploads to BunnyCDN
 * 4. Updates the asset record with the new BunnyCDN URL
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_CDN_HOSTNAME) {
  console.error('❌ Missing BunnyCDN environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Transfer a single image from Apiframe to BunnyCDN
 */
async function transferImage(asset) {
  try {
    const sourceUrl = asset.url || asset.storage_path;
    
    if (!sourceUrl) {
      console.log(`  ⚠️ Skipping asset ${asset.id}: No URL found`);
      return { success: false, reason: 'no_url' };
    }

    // Skip if already on BunnyCDN
    if (sourceUrl.includes('b-cdn.net') || sourceUrl.includes('bunnycdn')) {
      console.log(`  ✓ Asset ${asset.id} already on BunnyCDN`);
      return { success: true, reason: 'already_migrated' };
    }

    // Only transfer Apiframe URLs
    if (!sourceUrl.includes('apiframe.pro') && !sourceUrl.includes('cdn.apiframe')) {
      console.log(`  ⚠️ Skipping asset ${asset.id}: Not an Apiframe URL (${sourceUrl.substring(0, 50)}...)`);
      return { success: false, reason: 'not_apiframe' };
    }

    console.log(`  📥 Downloading: ${sourceUrl.substring(0, 80)}...`);

    // Download image from Apiframe
    const imageResponse = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MigrationScript/1.0)'
      }
    });
    
    if (!imageResponse.ok) {
      console.error(`  ❌ Download failed: ${imageResponse.status} ${imageResponse.statusText}`);
      return { success: false, reason: 'download_failed', error: imageResponse.statusText };
    }

    const imageBuffer = await imageResponse.buffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const fileSize = imageBuffer.length;

    console.log(`  ✅ Downloaded ${(fileSize / 1024).toFixed(2)} KB`);

    // Generate filename
    const ext = contentType.split('/')[1] || 'png';
    const assetFilename = asset.file_name || `migrated-${asset.id}`;
    const filename = `${assetFilename.replace(/[^a-z0-9_-]/gi, '_')}.${ext}`;
    const storagePath = asset.project_id 
      ? `projects/${asset.project_id}/migrated/${filename}`
      : `migrated/${filename}`;

    // Upload to BunnyCDN
    console.log(`  📤 Uploading to BunnyCDN: ${storagePath}`);
    
    const bunnyUploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${storagePath}`;
    
    const uploadResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': contentType,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      console.error(`  ❌ Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      return { success: false, reason: 'upload_failed', error: uploadResponse.statusText };
    }

    const cdnUrl = `https://${BUNNY_CDN_HOSTNAME}/${storagePath}`;
    console.log(`  ✅ Uploaded to BunnyCDN: ${cdnUrl}`);

    // Update Supabase record
    console.log(`  🔄 Updating database record...`);
    
    const { data: updateData, error: updateError } = await supabase
      .from('assets')
      .update({
        cdn_url: cdnUrl,
        storage_path: storagePath,
        url: cdnUrl, // Primary URL now points to BunnyCDN
        file_size: fileSize,
        mime_type: contentType,
        metadata: {
          ...asset.metadata,
          originalUrl: sourceUrl,
          migratedAt: new Date().toISOString(),
          migratedBy: 'migration-script'
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', asset.id)
      .select()
      .single();

    if (updateError) {
      console.error(`  ❌ Database update failed:`, updateError.message);
      return { success: false, reason: 'db_update_failed', error: updateError.message };
    }

    console.log(`  ✅ Asset ${asset.id} migrated successfully!`);
    return { success: true, cdnUrl, fileSize };

  } catch (error) {
    console.error(`  ❌ Error transferring asset ${asset.id}:`, error.message);
    return { success: false, reason: 'exception', error: error.message };
  }
}

/**
 * Main migration function
 */
async function migrateAllImages() {
  console.log('🚀 Starting image migration to BunnyCDN...\n');
  
  // Fetch all assets from Supabase
  console.log('📋 Fetching assets from Supabase...');
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch assets:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${assets.length} assets in database\n`);

  // Statistics
  const stats = {
    total: assets.length,
    migrated: 0,
    alreadyMigrated: 0,
    skipped: 0,
    failed: 0,
    totalSize: 0
  };

  // Process each asset
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    console.log(`\n[${i + 1}/${assets.length}] Processing asset ${asset.id}...`);
    
    const result = await transferImage(asset);
    
    if (result.success) {
      if (result.reason === 'already_migrated') {
        stats.alreadyMigrated++;
      } else {
        stats.migrated++;
        stats.totalSize += result.fileSize || 0;
      }
    } else {
      if (result.reason === 'not_apiframe' || result.reason === 'no_url') {
        stats.skipped++;
      } else {
        stats.failed++;
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total assets:          ${stats.total}`);
  console.log(`✅ Newly migrated:     ${stats.migrated}`);
  console.log(`✓  Already on BunnyCDN: ${stats.alreadyMigrated}`);
  console.log(`⚠️  Skipped:            ${stats.skipped}`);
  console.log(`❌ Failed:             ${stats.failed}`);
  console.log(`📦 Total transferred:  ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('='.repeat(60));
  
  if (stats.failed > 0) {
    console.log('\n⚠️  Some assets failed to migrate. Check logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  }
}

// Run migration
migrateAllImages().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

