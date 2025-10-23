// Google Cloud Function for Content List - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.contentList = async (req, res) => {
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
    const projectIndex = pathSegments.indexOf('project');
    
    if (projectIndex === -1 || !pathSegments[projectIndex + 1]) {
      return res.status(400).json({ error: 'Project ID required' });
    }
    
    const projectId = pathSegments[projectIndex + 1];
    console.log('🔍 DEBUG: Content List API called for project:', projectId);

    // Get content ideas for the project
    const { data: contentIdeas, error: ideasError } = await supabase
      .from('content_ideas')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (ideasError) {
      console.error('❌ Content ideas error:', ideasError);
      return res.status(500).json({ error: 'Failed to load content ideas' });
    }

    // Get posts for the project
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('❌ Posts error:', postsError);
      return res.status(500).json({ error: 'Failed to load posts' });
    }

    // Combine and format the data
    const allContent = [
      ...(contentIdeas || []).map(item => ({
        ...item,
        type: 'content_idea',
        content_type: 'idea'
      })),
      ...(posts || []).map(item => ({
        ...item,
        type: 'post',
        content_type: 'post'
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: allContent,
      count: allContent.length
    });

  } catch (error) {
    console.error('❌ Content list error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
