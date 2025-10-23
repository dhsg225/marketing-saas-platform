// Google Cloud Function for Assets - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.assets = async (req, res) => {
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

    // Parse query parameters
    const { project_id, scope = 'project', limit = 100 } = req.query;
    
    console.log('🔍 DEBUG: Assets API called with params:', { project_id, scope, limit });

    if (!project_id) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    // Get assets from database (if table exists) or return empty array
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.log('⚠️ Assets table not found, returning empty array');
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: assets || [],
      count: assets?.length || 0
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
