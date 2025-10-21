/**
 * ApiframeAdapter - Midjourney Image Generation via Apiframe.pro
 * 
 * This adapter connects to Apiframe's API which provides access to Midjourney v6.
 * API Documentation: https://api.apiframe.pro/docs
 * 
 * @extends BaseAdapter
 */

const BaseAdapter = require('./BaseAdapter');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Apiframe = require('@apiframe-ai/sdk').default;

class ApiframeAdapter extends BaseAdapter {
  /**
   * @inheritdoc
   */
  async generateJob(modelConfig, prompt, options, authContext) {
    try {
      const { apiKey } = authContext;
      
      if (!apiKey) {
        throw new Error('APIFRAME API key is required');
      }
      
      // Initialize the official APIFRAME SDK client
      const client = new Apiframe({ apiKey });
      
      // Prepare request data for the SDK
      const requestData = {
        prompt: prompt,
        model: 'v6' // Use Midjourney v6
      };
      
      // Add optional parameters if provided
      if (options.aspectRatio || options.aspect_ratio) {
        requestData.aspect_ratio = options.aspectRatio || options.aspect_ratio;
      }
      
      if (options.negativePrompt || options.negative_prompt) {
        requestData.negative_prompt = options.negativePrompt || options.negative_prompt;
      }
      
      if (options.style) {
        requestData.style = options.style;
      }
      
      if (options.quality) {
        requestData.quality = options.quality;
      }
      
      // Make request using the official SDK
      console.log(`🎨 [Apiframe] Initiating generation for user ${authContext.userId}`);
      console.log(`📝 [Apiframe] Prompt: "${prompt.substring(0, 50)}..."`);
      
      const response = await client.midjourney.imagine(requestData);
      
      // The SDK returns a task_id
      const providerJobId = response.task_id || response.id;
      
      if (!providerJobId) {
        throw new Error('APIFRAME SDK did not return a job ID');
      }
      
      console.log(`✅ [Apiframe] Job created: ${providerJobId}`);
      
      return {
        providerJobId,
        status: 'processing',
        metadata: {
          provider: 'apiframe',
          model: 'midjourney-v6',
          prompt: prompt,
          options: options,
          generatedAt: new Date().toISOString(),
          sdkVersion: 'official'
        }
      };
      
    } catch (error) {
      console.error(`❌ [Apiframe] Generation failed:`, error.message);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          throw new Error('Invalid APIFRAME API key');
        } else if (status === 429) {
          throw new Error('APIFRAME rate limit exceeded');
        } else if (status === 402) {
          throw new Error('APIFRAME insufficient credits');
        } else {
          throw new Error(`APIFRAME API error: ${data?.message || data?.error || 'Unknown error'}`);
        }
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * @inheritdoc
   */
  async checkStatus(jobId, providerJobId, modelConfig, authContext) {
    try {
      const { apiKey } = authContext;
      const { api_endpoint } = modelConfig;
      
      // Initialize the official APIFRAME SDK client
      const client = new Apiframe({ apiKey });
      
      // Query Apiframe for job status using the SDK
      const response = await client.tasks.get(providerJobId);
      
      const apiframeStatus = response.status;
      const progress = response.progress || (response.status === 'completed' ? 100 : 0);
      
      // Map Apiframe statuses to our standard statuses
      let standardStatus;
      let standardProgress;
      
      switch (apiframeStatus) {
        case 'pending':
        case 'queued':
          standardStatus = 'pending';
          standardProgress = 0;
          break;
        case 'processing':
        case 'generating':
          standardStatus = 'processing';
          standardProgress = Math.min(progress, 95); // Cap at 95% until done
          break;
        case 'completed':
        case 'done':
        case 'success':
        case 'finished':
          standardStatus = 'completed';
          standardProgress = 100;
          break;
        case 'failed':
        case 'error':
          standardStatus = 'failed';
          standardProgress = 0;
          break;
        default:
          standardStatus = 'processing';
          standardProgress = progress;
      }
      
      return {
        status: standardStatus,
        progress: standardProgress,
        message: response.message || `Job is ${standardStatus}`,
        metadata: {
          apiframeStatus,
          provider: 'apiframe',
          updatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error(`❌ [Apiframe] Status check failed for job ${providerJobId}:`, error);
      console.error(`❌ [Apiframe] Error details:`, {
        message: error?.message,
        response: error?.response,
        stack: error?.stack
      });
      
      if (error.response && error.response.status === 404) {
        throw new Error(`Apiframe job ${providerJobId} not found`);
      }
      
      // Handle SDK-specific errors
      if (error.message) {
        throw new Error(`[Apiframe] ${error.message}`);
      } else {
        throw new Error(`[Apiframe] Unknown error occurred: ${JSON.stringify(error)}`);
      }
    }
  }

  /**
   * @inheritdoc
   */
  async getResults(jobId, providerJobId, modelConfig, authContext) {
    try {
      const { apiKey } = authContext;
      const { api_endpoint } = modelConfig;
      
      // Initialize the official APIFRAME SDK client
      const client = new Apiframe({ apiKey });
      
      // Fetch completed job results from Apiframe using the SDK
      const data = await client.tasks.get(providerJobId);
      
      // Check if job is actually completed
      if (data.status !== 'completed' && data.status !== 'success' && data.status !== 'done' && data.status !== 'finished') {
        throw new Error(`Job is not completed yet. Current status: ${data.status}`);
      }
      
      // Extract image URLs - SDK returns image_urls array
      const imageUrls = data.image_urls || [];
      
      if (imageUrls.length === 0) {
        throw new Error('No images found in Apiframe response');
      }
      
      // Transform to standard format
      const assets = imageUrls.map((url, index) => ({
        url,
        type: 'image',
        metadata: {
          provider: 'apiframe',
          model: 'midjourney-v6',
          prompt: data.prompt || 'N/A',
          format: 'png', // Midjourney typically returns PNG
          width: data.width || 1024,
          height: data.height || 1024,
          index: index,
          providerJobId,
          generatedAt: data.created_at || new Date().toISOString(),
          // Include any additional Apiframe metadata
          seed: data.seed,
          aspectRatio: data.aspect_ratio
        }
      }));
      
      console.log(`✅ [Apiframe] Retrieved ${assets.length} asset(s) for job ${providerJobId}`);
      
      return assets;
      
    } catch (error) {
      console.error(`❌ [Apiframe] Results retrieval failed for job ${providerJobId}:`, error.message);
      
      if (error.response && error.response.status === 404) {
        throw new Error(`Apiframe job ${providerJobId} not found or results expired`);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Normalize Apiframe-specific errors
   * @override
   */
  normalizeError(error) {
    const message = error.response?.data?.message 
      || error.response?.data?.error 
      || error.message 
      || 'Unknown Apiframe error';
    
    return new Error(`[Apiframe] ${message}`);
  }

  /**
   * Validate Apiframe-specific configuration
   * @override
   */
  validateConfig(modelConfig) {
    const baseValidation = super.validateConfig(modelConfig);
    
    if (!baseValidation.valid) {
      return baseValidation;
    }
    
    const errors = [];
    
    // Apiframe-specific validations
    if (!modelConfig.api_endpoint.includes('apiframe')) {
      errors.push('api_endpoint must be an Apiframe URL');
    }
    
    if (modelConfig.api_key_type !== 'global' && modelConfig.api_key_type !== 'user_specific') {
      errors.push('api_key_type must be either "global" or "user_specific"');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = ApiframeAdapter;

