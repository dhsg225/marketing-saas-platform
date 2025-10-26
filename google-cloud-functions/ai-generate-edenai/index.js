// Google Cloud Function for AI Image Generation - HYBRID INTEGRATION
// [Oct 23, 2025 20:15] - Supports both Apiframe (current Midjourney) and Eden AI providers
// [Oct 24, 2025 10:30] - Added Upstash Redis for async job tracking (fixes polling issues)
// Routes to appropriate provider based on model_identifier
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { Redis } = require('@upstash/redis');

// [Oct 24, 2025 10:30] Initialize Upstash Redis client for job tracking
let redisClient = null;

function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn('⚠️ Redis not configured - job tracking disabled');
    return null;
  }

  // Upstash REST API client (no connection needed - REST calls)
  redisClient = new Redis({
    url: redisUrl,
    token: redisToken
  });

  console.log('✅ Upstash Redis client initialized');
  return redisClient;
}

exports['ai-generate-edenai'] = async (req, res) => {
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
    const edenAiKey = process.env.EDENAI_API_KEY;
    const apiframeKey = process.env.APIFRAME_API_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        success: false,
        error: 'Missing Supabase environment variables' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const redis = getRedisClient(); // Upstash is synchronous REST client

    // [Oct 25, 2025 02:22] Handle GET requests for status/results - Poll Apiframe directly
    if (req.method === 'GET') {
      // GCF doesn't support sub-paths, read from query params
      const endpoint = req.query.endpoint;
      const jobId = req.query.jobId;
      
      if (!endpoint || !jobId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing endpoint or jobId query parameter',
          received: { endpoint, jobId, query: req.query }
        });
      }

      console.log(`🔍 GET ${endpoint}/${jobId} - Polling Apiframe directly`);

      if (!apiframeKey) {
        return res.status(503).json({
          success: false,
          error: 'Apiframe API key not configured'
        });
      }

      // [Oct 25, 2025 01:50] Poll Apiframe task status directly (no Redis needed!)
      try {
        const taskStatusResponse = await fetch(`https://api.apiframe.pro/status/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiframeKey}`
          }
        });

        if (!taskStatusResponse.ok) {
          console.error(`❌ Apiframe status check failed: ${taskStatusResponse.status}`);
          return res.status(taskStatusResponse.status).json({
            success: false,
            error: 'Failed to check Apiframe status',
            details: await taskStatusResponse.text()
          });
        }

        const taskData = await taskStatusResponse.json();
        console.log(`📥 Apiframe task status:`, taskData.status);

        // Transform Apiframe response to our format
        const status = taskData.status === 'finished' ? 'completed' : 
                       taskData.status === 'failed' ? 'failed' : 'processing';

        if (endpoint === 'status') {
          // Return status for polling
          return res.json({
            success: true,
            jobId,
            status,
            progress: status === 'completed' ? 100 : (status === 'processing' ? 50 : 0),
            message: taskData.message || `Task ${taskData.status}`
          });
        } else {
          // Return results
          if (status !== 'completed') {
            return res.json({
              success: false,
              error: 'Task not completed yet',
              status: taskData.status
            });
          }

          // Transform Apiframe images to our asset format
          const assets = (taskData.image_urls || []).map((url, index) => ({
            url,
            metadata: {
              provider: 'apiframe',
              width: 1024,
              height: 1024,
              format: 'png',
              task_id: jobId,
              actions: taskData.actions || []
            }
          }));
          
          return res.json({
            success: true,
            assets,
            jobId,
            status: 'completed'
          });
        }
      } catch (apiframeError) {
        console.error('❌ Apiframe polling error:', apiframeError);
        return res.status(500).json({
          success: false,
          error: 'Failed to poll Apiframe',
          details: apiframeError.message
        });
      }
    }

    // POST request - initiate generation
    const { 
      modelId,           // e.g., "openai-dall-e-3"
      prompt, 
      options = {},
      userId,
      organizationId,
      projectId
    } = req.body;

    console.log('🔍 DEBUG: Eden AI generation request:', { modelId, prompt: prompt?.substring(0, 50) + '...' });

    // Validate required fields
    if (!modelId || !prompt) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: modelId and prompt are required' 
      });
    }

    // Step 1: Verify model exists and is enabled
    console.log(`🔍 Querying model: ${modelId}`);
    const { data: model, error: modelError } = await supabase
      .from('ai_image_models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (modelError || !model) {
      console.error('❌ Model lookup failed:', { modelId, modelError, model });
      return res.status(404).json({ 
        success: false,
        error: 'Model not found or query failed',
        modelId,
        details: modelError?.message || 'No model data returned'
      });
    }
    
    console.log(`✅ Found model: ${model.name} (${model.provider})`);


    if (!model.enabled) {
      console.error('❌ Model disabled:', modelId);
      return res.status(400).json({ 
        success: false,
        error: 'This model is not currently available. Please choose another.',
        modelId,
        modelName: model.name
      });
    }

    console.log(`✅ Model validated: ${model.name} (${model.provider})`);

    // Step 2: Route to appropriate provider based on model_identifier
    const isApiframe = model.model_identifier === 'apiframe' || model.provider === 'apiframe';
    const isEdenAi = !isApiframe;

    if (isApiframe && !apiframeKey) {
      return res.status(500).json({ 
        success: false,
        error: 'Apiframe API key not configured' 
      });
    }

    if (isEdenAi && !edenAiKey) {
      return res.status(500).json({ 
        success: false,
        error: 'Eden AI API key not configured' 
      });
    }

    console.log(`🔀 Routing to: ${isApiframe ? 'Apiframe' : 'Eden AI'}`);

    const startTime = Date.now();
    let generatedImages = [];
    let totalCost = 0;

    // ========================================================================
    // APIFRAME INTEGRATION (Your existing Midjourney provider)
    // ========================================================================
    if (isApiframe) {
      console.log('🎨 Calling Apiframe for Midjourney generation');

      // [Oct 24, 2025 - 09:35] Build Apiframe payload with proper type conversion
      const apiframePayload = {
        prompt: prompt,
        aspect_ratio: options.aspectRatio || '1:1',
        model: 'midjourney-v6'
      };

      // Add optional parameters with type validation
      if (options.quality) {
        // Apiframe expects quality as string: "standard" or "hd" for Midjourney
        // If numeric, convert: 1="standard", 2="hd"
        const quality = typeof options.quality === 'number' 
          ? (options.quality === 2 ? 'hd' : 'standard')
          : options.quality;
        apiframePayload.quality = quality;
      }
      
      if (options.style) apiframePayload.style = options.style;
      if (options.chaos) apiframePayload.chaos = parseInt(options.chaos);
      if (options.stylize) apiframePayload.stylize = parseInt(options.stylize);
      
      console.log('🔍 DEBUG: Apiframe payload:', JSON.stringify(apiframePayload, null, 2));

      const apiframeResponse = await fetch('https://api.apiframe.pro/imagine', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiframeKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiframePayload)
      });

      const apiframeData = await apiframeResponse.json();

      if (!apiframeResponse.ok) {
        console.error('❌ Apiframe HTTP error:', apiframeResponse.status, apiframeData);
        return res.status(apiframeResponse.status).json({ 
          success: false,
          error: 'Apiframe API request failed',
          details: apiframeData 
        });
      }

      // [Oct 25, 2025 01:50] Apiframe returns task_id for async processing - NO REDIS, direct polling!
      if (apiframeData.task_id) {
        console.log(`✅ Apiframe task created: ${apiframeData.task_id}`);
        
        const jobId = apiframeData.task_id;
        
        // [Oct 25, 2025 02:52] Store in database for webhook to find later
        const { error: logError } = await supabase.from('ai_image_generation_logs').insert({
          user_id: userId,
          organization_id: organizationId,
          project_id: projectId,
          model_id: modelId,
          prompt: prompt,
          resolution: options.aspectRatio || '1:1',
          success: false, // Will be updated to true by webhook when complete
          generation_time: 0,
          options: { 
            apiframe_task_id: jobId,
            status: 'processing',
            aspectRatio: options.aspectRatio
          }
        });
        
        if (logError) {
          console.error('❌ Failed to create generation log:', logError);
        } else {
          console.log(`✅ Created generation log for task ${jobId}`);
        }

        // Return job ID for polling
        return res.json({ 
          success: true,
          jobId,
          status: 'processing',
          estimatedTime: model.estimated_time,
          message: 'Generation job created - poll /ai/status/:jobId for progress (polls Apiframe directly)'
        });
      }

      // Fallback: If Apiframe returns images immediately (synchronous mode)
      if (apiframeData.images) {
        const generationTime = Date.now() - startTime;
        generatedImages = (apiframeData.images || []).map((img, index) => ({
          url: img.url || img,
          cost: model.cost_per_generation,
          index: index,
          provider: 'apiframe',
          modelName: model.name
        }));

        totalCost = generatedImages.length * model.cost_per_generation;
        console.log(`✅ Apiframe generated ${generatedImages.length} images (sync mode)`);
      } else {
        console.error('❌ Unexpected Apiframe response:', apiframeData);
        return res.status(500).json({ 
          success: false,
          error: 'Unexpected Apiframe response format',
          details: apiframeData 
        });
      }
    }

    // ========================================================================
    // EDEN AI INTEGRATION (For all other providers)
    // ========================================================================
    else {
      console.log('🎨 Calling Eden AI for generation');

      // Step 2: Prepare Eden AI request
    const resolution = options.resolution || '1024x1024';
    const aspectRatio = options.aspectRatio || '1:1';
    
    // Map aspect ratio to resolution if not explicitly provided
    const resolutionMap = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '4:3': '1024x768',
      '3:4': '768x1024'
    };
    
    const finalResolution = options.resolution || resolutionMap[aspectRatio] || '1024x1024';

    // Build Eden AI request payload
    const edenAiPayload = {
      providers: [model.model_identifier], // Use model_identifier from database
      text: prompt,
      resolution: finalResolution,
      num_images: options.num_images || 1,
      fallback_providers: options.fallback_providers || []
    };

    // Add provider-specific options
    if (options.negativePrompt) {
      edenAiPayload.negative_prompt = options.negativePrompt;
    }

    // Advanced options (if provided)
    if (options.style) edenAiPayload.style = options.style;
    if (options.quality) edenAiPayload.quality = options.quality;

      console.log('🎨 Calling Eden AI with provider:', model.model_identifier);

      // Step 3: Call Eden AI API
      const edenResponse = await fetch('https://api.edenai.run/v2/image/generation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${edenAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(edenAiPayload)
      });

      const edenData = await edenResponse.json();
      const generationTime = Date.now() - startTime;

      console.log('Eden AI response status:', edenResponse.status);
      console.log('Eden AI response data:', JSON.stringify(edenData).substring(0, 200));

      if (!edenResponse.ok) {
        console.error('❌ Eden AI error:', edenData);
        
        // Log failed attempt
        await supabase.from('ai_image_generation_logs').insert({
          user_id: userId,
          organization_id: organizationId,
          project_id: projectId,
          model_id: modelId,
          prompt: prompt,
          negative_prompt: options.negativePrompt,
          resolution: finalResolution,
          options: options,
          success: false,
          generation_time: generationTime,
          error_message: edenData.detail || edenData.error || 'Unknown error'
        });

        return res.status(edenResponse.status).json({ 
          success: false,
          error: 'Eden AI generation failed',
          details: edenData 
        });
      }

      // Step 4: Extract image URLs from Eden AI response
      // Eden AI returns: { [provider]: { status: "success", items: [{image: url, cost: 0.04}] } }
      const providerKey = model.model_identifier.split('/')[0]; // Handle "replicate/midjourney"
      const providerData = edenData[providerKey] || edenData[model.provider];

      if (!providerData || providerData.status !== 'success' || !providerData.items || providerData.items.length === 0) {
        console.error('❌ No images in Eden AI response');
        
        // Log failed attempt
        await supabase.from('ai_image_generation_logs').insert({
          user_id: userId,
          organization_id: organizationId,
          project_id: projectId,
          model_id: modelId,
          prompt: prompt,
          success: false,
          generation_time: generationTime,
          error_message: 'No images returned from provider'
        });

        return res.status(500).json({ 
          success: false,
          error: 'No images generated',
          details: edenData 
        });
      }

      // Extract images and costs from Eden AI
      generatedImages = providerData.items.map((item, index) => ({
        url: item.image_resource_url || item.image,
        cost: item.cost || model.cost_per_generation,
        index: index,
        provider: model.provider,
        modelName: model.name
      }));

      totalCost = generatedImages.reduce((sum, img) => sum + (img.cost || 0), 0);

      console.log(`✅ Eden AI generated ${generatedImages.length} image(s), total cost: $${totalCost}`);
    }

    // ========================================================================
    // COMMON: Log successful generation and return response
    // ========================================================================
    const generationTime = Date.now() - startTime;

    // Step 5: Log successful generation
    const logEntries = generatedImages.map((img, index) => ({
      user_id: userId,
      organization_id: organizationId,
      project_id: projectId,
      model_id: modelId,
      prompt: prompt,
      negative_prompt: options.negativePrompt,
      resolution: isApiframe ? (options.aspectRatio || '1:1') : finalResolution,
      options: options,
      success: true,
      generation_time: Math.round(generationTime / generatedImages.length), // Distribute time
      cost: img.cost,
      image_url: img.url
    }));

    await supabase.from('ai_image_generation_logs').insert(logEntries);

    // Step 6: Return success response
    res.json({
      success: true,
      jobId: `${isApiframe ? 'apiframe' : 'eden'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      provider: model.provider,
      modelName: model.name,
      integration: isApiframe ? 'apiframe' : 'eden-ai',
      assets: generatedImages.map(img => ({
        url: img.url,
        metadata: {
          provider: img.provider,
          model: img.modelName,
          width: isApiframe ? 1024 : (parseInt(finalResolution.split('x')[0]) || 1024),
          height: isApiframe ? 1024 : (parseInt(finalResolution.split('x')[1]) || 1024),
          format: 'png',
          cost: img.cost,
          generationTime: generationTime,
          prompt: prompt,
          integration: isApiframe ? 'apiframe' : 'eden-ai'
        }
      })),
      totalCost: totalCost,
      generationTime: generationTime,
      message: `Successfully generated ${generatedImages.length} image(s) using ${model.name} via ${isApiframe ? 'Apiframe' : 'Eden AI'}`
    });

  } catch (error) {
    console.error('❌ Eden AI generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

