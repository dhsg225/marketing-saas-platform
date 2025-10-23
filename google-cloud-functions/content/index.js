// Google Cloud Function for Content - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.content = async (req, res) => {
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

    // Check if this is a history request
    const pathSegments = req.url?.split('/').filter(Boolean) || [];
    const historyIndex = pathSegments.indexOf('history');
    
    if (historyIndex !== -1) {
      // Get content history
      console.log('🔍 DEBUG: Content History API called');
      
      const { data: contentHistory, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Limit to prevent large responses

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: contentHistory || []
      });
    } else {
      // Get all content
      const { data: content, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: content || []
      });
    }

  } catch (error) {
    console.error('❌ Content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
