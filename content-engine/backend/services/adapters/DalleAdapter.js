/**
 * DalleAdapter - OpenAI DALL-E Image Generation
 * 
 * This adapter connects to OpenAI's DALL-E API (both DALL-E 2 and DALL-E 3).
 * API Documentation: https://platform.openai.com/docs/api-reference/images
 * 
 * @extends BaseAdapter
 */

const BaseAdapter = require('./BaseAdapter');
const axios = require('axios');

class DalleAdapter extends BaseAdapter {
  /**
   * @inheritdoc
   */
  async generateJob(modelConfig, prompt, options, authContext) {
    try {
      const { apiKey } = authContext;
      const { api_endpoint, model_id } = modelConfig;
      
      // Determine which DALL-E version
      const isDalle3 = model_id.includes('dalle-3');
      
      // Build OpenAI request
      const requestData = {
        model: isDalle3 ? 'dall-e-3' : 'dall-e-2',
        prompt: prompt,
        n: options.n || 1, // Number of images
        size: this._mapSize(options.size, isDalle3),
      };
      
      // DALL-E 3 specific options
      if (isDalle3) {
        if (options.quality) {
          requestData.quality = options.quality === 'hd' ? 'hd' : 'standard';
        }
        if (options.style) {
          requestData.style = options.style === 'natural' ? 'natural' : 'vivid';
        }
      }
      
      // Response format
      requestData.response_format = 'url'; // Get URLs instead of base64
      
      console.log(`🎨 [DALL-E] Initiating ${requestData.model} generation for user ${authContext.userId}`);
      console.log(`📝 [DALL-E] Prompt: "${prompt.substring(0, 50)}..."`);
      
      // OpenAI DALL-E is synchronous - we get results immediately
      const response = await axios.post(
        `${api_endpoint}/images/generations`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout - DALL-E can take time
        }
      );
      
      // DALL-E returns images immediately in the response
      const images = response.data.data;
      
      if (!images || images.length === 0) {
        throw new Error('OpenAI did not return any images');
      }
      
      console.log(`✅ [DALL-E] Generated ${images.length} image(s) immediately`);
      
      // Since DALL-E is synchronous, we create a synthetic job ID and mark as completed
      const providerJobId = `dalle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        providerJobId,
        status: 'completed', // DALL-E jobs are completed immediately
        metadata: {
          provider: 'openai',
          model: requestData.model,
          size: requestData.size,
          quality: requestData.quality || 'standard',
          style: requestData.style || 'vivid',
          syncGeneration: true, // Flag that this was synchronous
          images: images.map(img => ({
            url: img.url,
            revised_prompt: img.revised_prompt // DALL-E 3 provides this
          }))
        }
      };
      
    } catch (error) {
      console.error(`❌ [DALL-E] Generation failed:`, error.message);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          throw new Error('OpenAI API key is invalid or expired');
        } else if (status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        } else if (status === 400) {
          const errorMessage = data.error?.message || 'Invalid request';
          throw new Error(`OpenAI API error: ${errorMessage}`);
        } else if (status === 402) {
          throw new Error('OpenAI account has insufficient credits or billing not setup');
        } else {
          throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
        }
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * @inheritdoc
   * 
   * Note: For DALL-E, status checking is not needed since generation is synchronous.
   * However, we implement it for API consistency.
   */
  async checkStatus(jobId, providerJobId, modelConfig, authContext) {
    // DALL-E jobs are completed immediately, so status is always 'completed'
    // This method exists for API consistency but isn't actively used
    
    return {
      status: 'completed',
      progress: 100,
      message: 'DALL-E generation completed (synchronous)',
      metadata: {
        provider: 'openai',
        syncGeneration: true,
        note: 'DALL-E generations complete immediately'
      }
    };
  }

  /**
   * @inheritdoc
   * 
   * For DALL-E, results are already available from generateJob().
   * This method extracts them from the stored metadata.
   */
  async getResults(jobId, providerJobId, modelConfig, authContext) {
    // For DALL-E, results are stored in the job metadata during generation
    // This would typically be called by the service layer which has access to the job record
    
    // Since we don't have direct DB access here, we throw an error
    // The service layer will handle extracting results from job.provider_metadata
    throw new Error('DALL-E results are retrieved synchronously. Check job.provider_metadata.images');
  }

  /**
   * Extract results from DALL-E job metadata
   * This is a helper method for the service layer
   * 
   * @param {Object} jobMetadata - The provider_metadata from ai_generation_jobs
   * @returns {Array} Standardized asset array
   */
  static extractResultsFromMetadata(jobMetadata) {
    if (!jobMetadata.images || !Array.isArray(jobMetadata.images)) {
      return [];
    }
    
    return jobMetadata.images.map((img, index) => ({
      url: img.url,
      type: 'image',
      metadata: {
        provider: 'openai',
        model: jobMetadata.model,
        prompt: jobMetadata.prompt || 'N/A',
        revisedPrompt: img.revised_prompt, // DALL-E 3 feature
        format: 'png', // OpenAI returns PNG
        size: jobMetadata.size,
        quality: jobMetadata.quality,
        style: jobMetadata.style,
        index: index,
        generatedAt: new Date().toISOString()
      }
    }));
  }

  /**
   * Map user-friendly size to OpenAI's supported sizes
   */
  _mapSize(requestedSize, isDalle3) {
    if (!requestedSize) {
      return isDalle3 ? '1024x1024' : '1024x1024';
    }
    
    if (isDalle3) {
      // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
      const supportedSizes = ['1024x1024', '1792x1024', '1024x1792'];
      
      // Map common aspect ratios
      if (requestedSize === '16:9' || requestedSize === 'landscape') {
        return '1792x1024';
      } else if (requestedSize === '9:16' || requestedSize === 'portrait') {
        return '1024x1792';
      } else if (supportedSizes.includes(requestedSize)) {
        return requestedSize;
      }
      
      return '1024x1024'; // Default square
      
    } else {
      // DALL-E 2 supports: 256x256, 512x512, 1024x1024
      const supportedSizes = ['256x256', '512x512', '1024x1024'];
      
      if (supportedSizes.includes(requestedSize)) {
        return requestedSize;
      }
      
      // Map to closest size
      if (requestedSize.includes('256')) return '256x256';
      if (requestedSize.includes('512')) return '512x512';
      
      return '1024x1024'; // Default
    }
  }

  /**
   * Normalize OpenAI-specific errors
   * @override
   */
  normalizeError(error) {
    const message = error.response?.data?.error?.message 
      || error.message 
      || 'Unknown OpenAI error';
    
    return new Error(`[OpenAI DALL-E] ${message}`);
  }

  /**
   * Validate DALL-E-specific configuration
   * @override
   */
  validateConfig(modelConfig) {
    const baseValidation = super.validateConfig(modelConfig);
    
    if (!baseValidation.valid) {
      return baseValidation;
    }
    
    const errors = [];
    
    // OpenAI-specific validations
    if (!modelConfig.api_endpoint.includes('openai.com')) {
      errors.push('api_endpoint must be an OpenAI URL');
    }
    
    if (!modelConfig.model_id.includes('dalle')) {
      errors.push('model_id should indicate DALL-E model');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = DalleAdapter;

