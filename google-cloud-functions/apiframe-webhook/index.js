// [Oct 25, 2025 - 02:30] Webhook handler for Apiframe - saves directly to Supabase (no Redis)
const { createClient } = require('@supabase/supabase-js');

exports['apiframe-webhook'] = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Apiframe webhook payload
    const {
      task_id,
      status,
      image_urls,
      actions,
      original_image_url,
      message
    } = req.body;

    console.log(`📥 Webhook received for task ${task_id}: ${status}`);

    if (!task_id) {
      return res.status(400).json({ error: 'task_id required' });
    }

    // [Oct 25, 2025 02:28] Skip Redis - save images directly to Supabase assets table!
    console.log(`📥 Received ${image_urls?.length || 0} images for task ${task_id}`);

    if (status === 'finished' && image_urls && image_urls.length > 0) {
      // [Oct 25, 2025 02:46] Get the generation log to find project/org/user info
      const { data: logData, error: logError } = await supabase
        .from('ai_image_generation_logs')
        .select('*')
        .eq('options->>apiframe_task_id', task_id)
        .single();
      
      if (logError || !logData) {
        console.error(`❌ Could not find generation log for task ${task_id}:`, logError);
        return res.json({ 
          success: false,
          error: 'Generation log not found',
          task_id,
          status
        });
      }
      
      console.log(`✅ Found generation log for task ${task_id}`);

      if (logData) {
        // Save each image to assets table
        const assetInserts = image_urls.map((url, index) => ({
          file_name: `AI Generated ${index + 1} - ${task_id.substring(0, 8)}`,
          storage_path: url,
          url: url,
          scope: 'project',
          project_id: logData.project_id,
          organization_id: logData.organization_id,
          owner_user_id: logData.user_id,
          variants: {
            original: {
              url: url,
              width: 1024,
              height: 1024,
              format: 'png',
              size: 0
            }
          },
          metadata: {
            aiGenerated: true,
            provider: 'apiframe',
            task_id: task_id,
            prompt: logData.prompt,
            actions: actions,
            generatedAt: new Date().toISOString()
          }
        }));

        const { data: savedAssets, error: insertError } = await supabase
          .from('assets')
          .insert(assetInserts)
          .select();

        if (insertError) {
          console.error('❌ Failed to save assets:', insertError);
        } else {
          console.log(`✅ Saved ${image_urls.length} images to assets table!`);
          
          // [Oct 25, 2025 06:25] Auto-transfer to BunnyCDN for permanent storage
          // [Oct 25, 2025 14:25] RE-ENABLED - Fixed Singapore endpoint!
          if (savedAssets && savedAssets.length > 0) {
            console.log(`📤 Initiating BunnyCDN transfer for ${savedAssets.length} images...`);
            
            const fetch = require('node-fetch');
            const transferPromises = savedAssets.map(async (asset, index) => {
              try {
                const transferResponse = await fetch(
                  'https://us-central1-marketing-saas-ai.cloudfunctions.net/bunny-transfer',
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sourceUrl: image_urls[index],
                      projectId: logData.project_id,
                      assetId: asset.id,
                      metadata: {
                        originalProvider: 'apiframe',
                        task_id: task_id
                      }
                    })
                  }
                );
                
                const transferData = await transferResponse.json();
                if (transferData.success) {
                  console.log(`✅ Transferred image ${index + 1} to BunnyCDN: ${transferData.cdnUrl}`);
                } else {
                  console.warn(`⚠️ BunnyCDN transfer failed for image ${index + 1} (still accessible at Apiframe)`);
                }
              } catch (error) {
                console.error(`❌ Transfer error for image ${index + 1}:`, error.message);
              }
            });
            
            // Don't wait for transfers to complete - they'll happen in background
            Promise.all(transferPromises).catch(err => 
              console.error('⚠️ Some BunnyCDN transfers failed:', err.message)
            );
          }
        }
      }

      // Update generation log
      await supabase
        .from('ai_image_generation_logs')
        .update({
          success: true,
          generation_time: 0,
          image_url: image_urls[0] // Store first image URL
        })
        .eq('options->>apiframe_task_id', task_id);
    }

    res.json({ 
      success: true,
      message: 'Webhook processed',
      task_id,
      status
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

