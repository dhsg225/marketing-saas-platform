// Google Cloud Function for Playbook Recipes - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.playbookRecipes = async (req, res) => {
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

    // Parse project ID from URL path
    const pathSegments = req.url?.split('/').filter(Boolean) || [];
    const projectIndex = pathSegments.indexOf('recipes');
    
    if (projectIndex === -1 || !pathSegments[projectIndex + 1]) {
      return res.status(400).json({ error: 'Project ID required' });
    }
    
    const projectId = pathSegments[projectIndex + 1];
    console.log('🔍 DEBUG: Playbook Recipes API called for project:', projectId);

    // Get post types/recipes from database (if table exists) or return default types
    const { data: postTypes, error } = await supabase
      .from('post_types')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (error) {
      console.log('⚠️ Post types table not found, returning default types');
      
      // Return default post types
      const defaultTypes = [
        {
          id: 'social_post',
          name: 'Social Media Post',
          description: 'Short-form social media content',
          platform: 'social',
          format: 'post'
        },
        {
          id: 'blog_post',
          name: 'Blog Post',
          description: 'Long-form blog content',
          platform: 'blog',
          format: 'article'
        },
        {
          id: 'email_newsletter',
          name: 'Email Newsletter',
          description: 'Email marketing content',
          platform: 'email',
          format: 'newsletter'
        },
        {
          id: 'video_script',
          name: 'Video Script',
          description: 'Video content script',
          platform: 'video',
          format: 'script'
        }
      ];

      return res.json({
        success: true,
        data: defaultTypes
      });
    }

    res.json({
      success: true,
      data: postTypes || []
    });

  } catch (error) {
    console.error('❌ Playbook recipes error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
