// Google Cloud Function for AI Models Admin Management
// [Oct 23, 2025 19:50] - Admin-only endpoint for managing AI model settings
const { createClient } = require('@supabase/supabase-js');

exports['ai-models-admin'] = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS');
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

    // TODO: Add proper admin authentication check here
    // For now, accepting all authenticated requests
    // In production, verify user has admin role:
    // const authHeader = req.headers.authorization;
    // const token = authHeader?.replace('Bearer ', '');
    // Validate token and check user.role === 'admin'

    // ========================================================================
    // GET - Retrieve all models (including disabled) or usage stats
    // ========================================================================
    if (req.method === 'GET') {
      // Check if requesting usage stats
      const pathSegments = req.url?.split('/').filter(Boolean) || [];
      const isUsageRequest = pathSegments.includes('usage');

      if (isUsageRequest) {
        // Return usage statistics from analytics view
        const { data: stats, error: statsError } = await supabase
          .from('v_popular_ai_models')
          .select('*')
          .order('total_generations', { ascending: false });

        if (statsError) {
          console.error('❌ Failed to load usage stats:', statsError);
          // Return empty stats instead of error (view might not have data yet)
          return res.json({
            success: true,
            stats: [],
            message: 'No usage data available yet'
          });
        }

        console.log(`✅ Admin loaded usage stats for ${stats.length} models`);

        return res.json({
          success: true,
          stats: stats
        });
      }

      // Default: Return all models
      const { data: models, error } = await supabase
        .from('ai_image_models')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('❌ Failed to load models:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to load models',
          details: error.message 
        });
      }

      console.log(`✅ Admin loaded ${models.length} models`);

      return res.json({
        success: true,
        models: models,
        count: models.length,
        enabled_count: models.filter(m => m.enabled).length,
        disabled_count: models.filter(m => !m.enabled).length
      });
    }

    // ========================================================================
    // PUT/PATCH - Update model settings (toggle enabled, change order, etc.)
    // ========================================================================
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { modelId, updates } = req.body;

      if (!modelId) {
        return res.status(400).json({ 
          success: false,
          error: 'modelId is required' 
        });
      }

      console.log(`🔧 Admin updating model ${modelId}:`, updates);

      // Update the model
      const { data: updatedModel, error: updateError } = await supabase
        .from('ai_image_models')
        .update(updates)
        .eq('id', modelId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Failed to update model:', updateError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to update model',
          details: updateError.message 
        });
      }

      console.log(`✅ Model updated successfully: ${modelId}`);

      return res.json({
        success: true,
        model: updatedModel,
        message: `Model ${modelId} updated successfully`
      });
    }

    // ========================================================================
    // POST - Bulk update (e.g., toggle multiple models at once)
    // ========================================================================
    if (req.method === 'POST') {
      const { action, modelIds, updates } = req.body;

      if (action === 'bulk_update' && Array.isArray(modelIds)) {
        console.log(`🔧 Admin bulk updating ${modelIds.length} models`);

        const updatePromises = modelIds.map(modelId =>
          supabase
            .from('ai_image_models')
            .update(updates)
            .eq('id', modelId)
        );

        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r.error);

        if (errors.length > 0) {
          console.error('❌ Some updates failed:', errors);
          return res.status(500).json({ 
            success: false, 
            error: `Failed to update ${errors.length} models`,
            details: errors 
          });
        }

        console.log(`✅ Bulk updated ${modelIds.length} models`);

        return res.json({
          success: true,
          updated_count: modelIds.length,
          message: `Successfully updated ${modelIds.length} models`
        });
      }

      // Toggle all models (enable all or disable all)
      if (action === 'toggle_all') {
        const { enabled } = req.body;
        
        console.log(`🔧 Admin toggling all models to: ${enabled}`);

        const { data: updatedModels, error: toggleError } = await supabase
          .from('ai_image_models')
          .update({ enabled: enabled })
          .neq('id', '') // Update all rows
          .select();

        if (toggleError) {
          console.error('❌ Failed to toggle all:', toggleError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to toggle all models',
            details: toggleError.message 
          });
        }

        console.log(`✅ Toggled ${updatedModels.length} models to ${enabled}`);

        return res.json({
          success: true,
          updated_count: updatedModels.length,
          enabled: enabled,
          message: `Successfully ${enabled ? 'enabled' : 'disabled'} all models`
        });
      }

      return res.status(400).json({ 
        success: false,
        error: 'Invalid action. Supported: bulk_update, toggle_all' 
      });
    }

    // Unsupported method
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Supported: GET, PUT, PATCH, POST' 
    });

  } catch (error) {
    console.error('❌ AI Models Admin error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

