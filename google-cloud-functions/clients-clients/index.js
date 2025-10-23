// Google Cloud Function for Clients - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.clientsClients = async (req, res) => {
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

    // Extract organization ID from URL path
    const pathSegments = req.url?.split('/').filter(Boolean) || [];
    const orgId = pathSegments[pathSegments.length - 1]; // Last segment should be org ID
    
    console.log('🔍 DEBUG: Clients API called with URL:', req.url);
    console.log('🔍 DEBUG: Path segments:', pathSegments);
    console.log('🔍 DEBUG: Organization ID:', orgId);

    // Get clients from Supabase based on organization ID
    let clients = [];
    
    if (orgId && orgId !== 'undefined') {
      console.log('🔍 DEBUG: Querying clients for organization:', orgId);
      // Get clients for specific organization
      const { data: orgClients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', orgId);

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
      
      clients = orgClients || [];
      console.log('🔍 DEBUG: Found clients:', clients.length);
    } else {
      console.log('🔍 DEBUG: No valid organization ID provided');
      // If no org ID provided, return empty array
      clients = [];
    }

    res.json({
      success: true,
      data: clients
    });

  } catch (error) {
    console.error('❌ Clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
