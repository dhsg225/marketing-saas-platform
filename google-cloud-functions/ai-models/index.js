// Google Cloud Function for AI Models - DYNAMIC DATABASE-DRIVEN MODEL LIST
// [Oct 23, 2025 19:40] - Updated to query Supabase ai_image_models table instead of static list
const { createClient } = require('@supabase/supabase-js');

exports['ai-models'] = async (req, res) => {
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
      return res.status(500).json({ 
        success: false,
        error: 'Missing Supabase environment variables' 
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters
    const { type = 'image', include_disabled = 'false' } = req.query;
    
    console.log('🔍 DEBUG: AI Models API called with type:', type, 'include_disabled:', include_disabled);

    // Query ai_image_models table from Supabase
    let query = supabase
      .from('ai_image_models')
      .select('*')
      .order('display_order', { ascending: true });

    // Only return enabled models unless admin explicitly requests all
    if (include_disabled !== 'true') {
      query = query.eq('enabled', true);
    }

    const { data: dbModels, error } = await query;

    if (error) {
      console.error('❌ Database query error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to load AI models from database',
        details: error.message 
      });
    }

    // Transform database format to MediaPicker expected format
    const formattedModels = (dbModels || []).map(model => ({
      modelId: model.id,                              // e.g., "openai-dall-e-3"
      providerName: model.name,                       // e.g., "DALL-E 3"
      provider: model.provider,                       // e.g., "openai"
      modelType: 'image',                             // All are image models
      modelIdentifier: model.model_identifier,        // Eden AI provider string
      description: model.description || '',
      apiKeyType: model.requires_api_key ? 'user_specific' : 'service_provided',
      estimatedTime: model.estimated_time || 15,
      costPerGeneration: parseFloat(model.cost_per_generation) || 0,
      features: model.features || [],
      supportedFormats: ['png', 'jpg'],
      maxResolution: model.max_resolution || '1024x1024',
      supportedResolutions: model.supported_resolutions || ['1024x1024'],
      enabled: model.enabled,
      displayOrder: model.display_order
    }));

    console.log(`✅ Loaded ${formattedModels.length} AI models from database`);

    res.json({
      success: true,
      models: formattedModels,
      count: formattedModels.length,
      message: `Found ${formattedModels.length} ${include_disabled === 'true' ? '' : 'enabled '}AI models for ${type} generation`,
      source: 'database' // Indicates this is from DB, not static
    });

  } catch (error) {
    console.error('❌ AI Models error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
