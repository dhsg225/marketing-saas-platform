// Google Cloud Function for Projects - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.projects = async (req, res) => {
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

    // Extract project ID from URL path
    const pathSegments = req.url?.split('/').filter(Boolean) || [];
    const projectId = pathSegments[pathSegments.length - 1]; // Last segment should be project ID
    
    console.log('🔍 DEBUG: Projects API called with URL:', req.url);
    console.log('🔍 DEBUG: Path segments:', pathSegments);
    console.log('🔍 DEBUG: Project ID:', projectId);

    if (projectId && projectId !== 'undefined') {
      // Get specific project by ID
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({
        success: true,
        data: project
      });
    } else {
      // Get all projects
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: projects || []
      });
    }

  } catch (error) {
    console.error('❌ Projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
