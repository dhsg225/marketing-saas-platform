// [Oct 24, 2025 - 08:45] GCF to transfer images from Apiframe/external URLs to BunnyCDN
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

exports['bunny-transfer'] = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase environment variables' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // BunnyCDN Configuration
    const bunnyApiKey = process.env.BUNNY_API_KEY;
    const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE;
    const bunnyCdnHostname = process.env.BUNNY_CDN_HOSTNAME;

    if (!bunnyApiKey || !bunnyStorageZone || !bunnyCdnHostname) {
      return res.status(500).json({ error: 'Missing BunnyCDN environment variables' });
    }

    // Parse request body
    const { sourceUrl, projectId, assetId, metadata = {} } = req.body;

    if (!sourceUrl) {
      return res.status(400).json({ error: 'sourceUrl is required' });
    }

    console.log(`📥 Starting transfer: ${sourceUrl}`);

    // Step 1: Download image from source URL
    console.log('⬇️ Downloading from source...');
    const imageResponse = await fetch(sourceUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.buffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const fileSize = imageBuffer.length;

    console.log(`✅ Downloaded ${fileSize} bytes (${contentType})`);

    // Step 2: Generate unique filename
    const ext = contentType.split('/')[1] || 'png';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomId}.${ext}`;
    const storagePath = projectId ? `projects/${projectId}/${filename}` : `uploads/${filename}`;

    // Step 3: Upload to BunnyCDN
    console.log(`📤 Uploading to BunnyCDN: ${storagePath}`);
    
    // [Oct 25, 2025 14:25] Use Singapore endpoint - storage is region-specific!
    const bunnyUploadUrl = `https://sg.storage.bunnycdn.com/${bunnyStorageZone}/${storagePath}`;
    
    const uploadResponse = await fetch(bunnyUploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': bunnyApiKey,
        'Content-Type': contentType,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`BunnyCDN upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const cdnUrl = `https://${bunnyCdnHostname}/${storagePath}`;
    console.log(`✅ Uploaded to BunnyCDN: ${cdnUrl}`);

    // Step 4: Update or create asset record in Supabase
    if (assetId) {
      // Update existing asset
      console.log(`🔄 Updating asset ${assetId} with BunnyCDN URL...`);
      
      // [Oct 25, 2025 14:40] Remove updated_at - column doesn't exist in assets table
      const { data: updateData, error: updateError } = await supabase
        .from('assets')
        .update({
          cdn_url: cdnUrl,
          storage_path: storagePath,
          url: cdnUrl, // Primary URL now points to BunnyCDN
          file_size: fileSize,
          mime_type: contentType,
          metadata: {
            ...metadata,
            originalUrl: sourceUrl,
            transferredAt: new Date().toISOString(),
            transferredBy: 'bunny-transfer-gcf'
          }
        })
        .eq('id', assetId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Supabase update error:', updateError);
        throw new Error(`Failed to update asset: ${updateError.message}`);
      }

      console.log(`✅ Asset ${assetId} updated successfully`);

      return res.json({
        success: true,
        message: 'Asset transferred to BunnyCDN and updated',
        asset: updateData,
        cdnUrl,
        originalUrl: sourceUrl
      });

    } else {
      // Create new asset
      console.log(`➕ Creating new asset with BunnyCDN URL...`);
      
      const { data: createData, error: createError } = await supabase
        .from('assets')
        .insert({
          file_name: filename,
          storage_path: storagePath,
          url: cdnUrl,
          cdn_url: cdnUrl,
          scope: 'project',
          project_id: projectId,
          file_size: fileSize,
          mime_type: contentType,
          metadata: {
            ...metadata,
            originalUrl: sourceUrl,
            transferredAt: new Date().toISOString(),
            transferredBy: 'bunny-transfer-gcf'
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Supabase insert error:', createError);
        throw new Error(`Failed to create asset: ${createError.message}`);
      }

      console.log(`✅ New asset created: ${createData.id}`);

      return res.json({
        success: true,
        message: 'Asset transferred to BunnyCDN and created',
        asset: createData,
        cdnUrl,
        originalUrl: sourceUrl
      });
    }

  } catch (error) {
    console.error('❌ Bunny transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Transfer failed',
      details: error.message
    });
  }
};

