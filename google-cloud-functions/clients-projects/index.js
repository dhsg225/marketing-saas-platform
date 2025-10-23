// Google Cloud Function for Client Projects - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.clientsProjects = async (req, res) => {
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
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract client ID from URL path
    // URL format: /clients/projects/client/client-1
    const urlParts = req.url.split('/');
    const clientId = urlParts[urlParts.length - 1];
    
    console.log('🔍 URL:', req.url);
    console.log('🔍 URL Parts:', urlParts);
    console.log('🔍 Client ID:', clientId);
    
    if (!clientId || clientId === 'clients-projects') {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Get projects for the specific client from Supabase
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      success: true,
      data: projects || []
    });

  } catch (error) {
    console.error('❌ Client projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
