// Google Cloud Function for Tone Profiles - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.toneProfiles = async (req, res) => {
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

    console.log('🔍 DEBUG: Tone Profiles API called');

    // Get tone profiles from database (if table exists) or return default profiles
    const { data: toneProfiles, error } = await supabase
      .from('tone_profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.log('⚠️ Tone profiles table not found, returning default profiles');
      
      // Return default tone profiles
      const defaultProfiles = [
        {
          id: 'professional',
          name: 'Professional',
          description: 'Formal, business-like tone',
          characteristics: ['formal', 'authoritative', 'clear']
        },
        {
          id: 'casual',
          name: 'Casual',
          description: 'Friendly, conversational tone',
          characteristics: ['friendly', 'conversational', 'approachable']
        },
        {
          id: 'enthusiastic',
          name: 'Enthusiastic',
          description: 'Excited, energetic tone',
          characteristics: ['excited', 'energetic', 'passionate']
        },
        {
          id: 'educational',
          name: 'Educational',
          description: 'Informative, instructional tone',
          characteristics: ['informative', 'clear', 'helpful']
        }
      ];

      return res.json({
        success: true,
        data: defaultProfiles
      });
    }

    res.json({
      success: true,
      data: toneProfiles || []
    });

  } catch (error) {
    console.error('❌ Tone profiles error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
