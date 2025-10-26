// Google Cloud Function for Assets - SUPABASE MULTI-TABLE
const { createClient } = require('@supabase/supabase-js');

exports['assets'] = async (req, res) => {
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

    // Parse query parameters - handle both req.query and URL parsing
    let project_id = req.query.project_id;
    let scope = req.query.scope || 'project';
    let limit = req.query.limit || 100;
    
    // [Oct 24, 2025 - 07:40] Fallback: Parse URL manually if req.query is empty
    if (!project_id && req.url) {
      const urlParams = new URL(req.url, `http://localhost`).searchParams;
      project_id = urlParams.get('project_id');
      scope = urlParams.get('scope') || scope;
      limit = urlParams.get('limit') || limit;
    }
    
    console.log('🔍 DEBUG: Assets API called with params:', { 
      project_id, 
      scope, 
      limit,
      rawQuery: req.query,
      rawUrl: req.url 
    });

    // [Oct 24, 2025 - 08:25] Simplified: Just query Supabase tables
    let combinedAssets = [];
    
    // OPTION 1: Fetch from Supabase assets table
    let query = supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: dbAssets, error } = await query;

    if (error) {
      console.error('⚠️ Supabase assets table error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else if (dbAssets && dbAssets.length > 0) {
      console.log(`✅ Found ${dbAssets.length} assets in Supabase assets table`);
      console.log('Sample asset:', JSON.stringify(dbAssets[0], null, 2));
      combinedAssets = [...combinedAssets, ...dbAssets];
    } else {
      console.log('ℹ️ Assets table exists but is empty');
    }
    
    // OPTION 3: Fetch images from content_ideas table (where most images actually are)
    if (project_id) {
      console.log('📝 Fetching images from content_ideas table...');
      const { data: contentImages, error: contentError } = await supabase
        .from('content_ideas')
        .select('id, title, full_visual_url, image_prompt, created_at, updated_at')
        .eq('project_id', project_id)
        .not('full_visual_url', 'is', null)
        .neq('full_visual_url', '')
        .order('created_at', { ascending: false });
      
      if (!contentError && contentImages && contentImages.length > 0) {
        console.log(`✅ Found ${contentImages.length} images in content_ideas table`);
        const transformedAssets = contentImages.map(item => ({
          id: `content-idea-${item.id}`,
          file_name: item.title || 'Content Idea Image',
          storage_path: item.full_visual_url,
          url: item.full_visual_url,
          cdn_url: item.full_visual_url,
          image_prompt: item.image_prompt,
          created_at: item.created_at,
          file_size: 0, // Unknown for external URLs
          metadata: {
            source: 'content_ideas',
            contentIdeaId: item.id,
            type: 'content_idea_image'
          },
          variants: {
            thumbnail: { url: item.full_visual_url },
            original: { url: item.full_visual_url }
          }
        }));
        combinedAssets = [...combinedAssets, ...transformedAssets];
      } else if (contentError) {
        console.log('⚠️ Error fetching content_ideas images:', contentError.message);
      }
    }
    
    // OPTION 4: Fetch images from posts table
    if (project_id) {
      console.log('📮 Fetching images from posts table...');
      const { data: postImages, error: postError } = await supabase
        .from('posts')
        .select('id, title, attached_asset_url, created_at')
        .eq('project_id', project_id)
        .not('attached_asset_url', 'is', null)
        .neq('attached_asset_url', '')
        .order('created_at', { ascending: false });
      
      if (!postError && postImages && postImages.length > 0) {
        console.log(`✅ Found ${postImages.length} images in posts table`);
        const transformedPosts = postImages.map(item => ({
          id: `post-${item.id}`,
          file_name: item.title || 'Post Image',
          storage_path: item.attached_asset_url,
          url: item.attached_asset_url,
          cdn_url: item.attached_asset_url,
          created_at: item.created_at,
          file_size: 0,
          metadata: {
            source: 'posts',
            postId: item.id,
            type: 'post_image'
          },
          variants: {
            thumbnail: { url: item.attached_asset_url },
            original: { url: item.attached_asset_url }
          }
        }));
        combinedAssets = [...combinedAssets, ...transformedPosts];
      } else if (postError) {
        console.log('⚠️ Error fetching posts images:', postError.message);
      }
    }

    // Remove duplicates based on URL
    const uniqueAssets = combinedAssets.filter((asset, index, self) => 
      index === self.findIndex(a => a.url === asset.url)
    );

    console.log(`📊 Total assets: ${uniqueAssets.length} (${combinedAssets.length} before deduplication)`);

    res.json({
      success: true,
      data: uniqueAssets,
      count: uniqueAssets.length,
      debug: {
        sources: {
          assetsTable: combinedAssets.filter(a => !a.metadata?.source).length,
          contentIdeas: combinedAssets.filter(a => a.metadata?.source === 'content_ideas').length,
          posts: combinedAssets.filter(a => a.metadata?.source === 'posts').length
        },
        projectId: project_id,
        totalBeforeDedup: combinedAssets.length,
        totalAfterDedup: uniqueAssets.length
      }
    });

  } catch (error) {
    console.error('❌ Assets error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
