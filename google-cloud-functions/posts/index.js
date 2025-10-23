// Google Cloud Function for Posts - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.posts = async (req, res) => {
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

    // Check if this is a scheduled posts request
    const pathSegments = req.url?.split('/').filter(Boolean) || [];
    const scheduledIndex = pathSegments.indexOf('scheduled');
    
    if (scheduledIndex !== -1 && pathSegments[scheduledIndex + 1]) {
      // Get scheduled posts for specific project
      const projectId = pathSegments[scheduledIndex + 1];
      
      console.log('🔍 DEBUG: Scheduled Posts API called for project:', projectId);
      
      const { data: scheduledPosts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('project_id', projectId)
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: scheduledPosts || []
      });
    } else {
      // Get all posts
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: posts || []
      });
    }

  } catch (error) {
    console.error('❌ Posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
