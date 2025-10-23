// Google Cloud Function for Content Ideas - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.contentIdeas = async (req, res) => {
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

    // Check if this is a project-specific request
    const pathSegments = req.url?.split('/').filter(Boolean) || [];
    const projectIndex = pathSegments.indexOf('project');
    
    if (projectIndex !== -1 && pathSegments[projectIndex + 1]) {
      // Get content ideas for specific project
      const projectId = pathSegments[projectIndex + 1];
      
      console.log('🔍 DEBUG: Content Ideas API called for project:', projectId);
      
      const { data: contentIdeas, error } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: contentIdeas || []
      });
    } else {
      // Get all content ideas
      const { data: contentIdeas, error } = await supabase
        .from('content_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: contentIdeas || []
      });
    }

  } catch (error) {
    console.error('❌ Content Ideas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
