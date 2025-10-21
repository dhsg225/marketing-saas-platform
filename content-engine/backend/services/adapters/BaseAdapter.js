/**
 * BaseAdapter - Universal AI Provider Adapter Interface
 * 
 * All AI provider adapters MUST extend this class and implement the three required methods.
 * This ensures consistent behavior across all providers in the abstraction layer.
 * 
 * @abstract
 */

class BaseAdapter {
  constructor() {
    if (new.target === BaseAdapter) {
      throw new TypeError('Cannot construct BaseAdapter instances directly - must be extended');
    }
  }

  /**
   * Generate a new AI content job
   * 
   * This method initiates a generation request with the external provider.
   * It must return a standardized job object that can be tracked.
   * 
   * @param {Object} modelConfig - The model configuration from model_configs table
   * @param {string} modelConfig.model_id - Unique model identifier
   * @param {string} modelConfig.provider_name - Display name
   * @param {string} modelConfig.adapter_module - Adapter class name
   * @param {string} modelConfig.api_endpoint - Provider base URL
   * @param {string} modelConfig.api_key_type - 'user_specific' or 'global'
   * @param {Object} modelConfig.config_options - Provider-specific config
   * 
   * @param {string} prompt - The user's generation prompt
   * 
   * @param {Object} options - Standardized generation options
   * @param {string} [options.aspectRatio] - Image aspect ratio (e.g., '16:9', '1:1')
   * @param {string} [options.negativePrompt] - What to avoid in generation
   * @param {string} [options.style] - Style preset (if supported)
   * @param {number} [options.quality] - Quality level (provider-specific)
   * @param {string} [options.size] - Image size (e.g., '1024x1024')
   * @param {any} [options.*] - Any provider-specific options
   * 
   * @param {Object} authContext - Authentication and user context
   * @param {string} authContext.userId - The requesting user's UUID
   * @param {string} [authContext.organizationId] - Organization UUID
   * @param {string} [authContext.projectId] - Project UUID
   * @param {string} authContext.apiKey - The API key to use (global or user-specific)
   * 
   * @returns {Promise<Object>} Standardized job response
   * @returns {string} return.jobId - Platform-wide job ID (UUID)
   * @returns {string} return.providerJobId - Provider's job ID
   * @returns {string} return.status - Initial status ('pending' or 'processing')
   * @returns {Object} [return.metadata] - Any additional provider metadata
   * 
   * @throws {Error} If generation request fails
   */
  async generateJob(modelConfig, prompt, options, authContext) {
    throw new Error(`generateJob() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Check the status of an ongoing generation job
   * 
   * @param {string} jobId - Platform job ID (UUID)
   * @param {string} providerJobId - Provider's job ID
   * @param {Object} modelConfig - Model configuration
   * @param {Object} authContext - Authentication context
   * @param {string} authContext.apiKey - API key for this provider
   * 
   * @returns {Promise<Object>} Standardized status response
   * @returns {string} return.status - One of: 'pending', 'processing', 'completed', 'failed', 'cancelled'
   * @returns {number} return.progress - Completion percentage (0-100)
   * @returns {string} [return.message] - Optional status message
   * @returns {Object} [return.metadata] - Provider-specific metadata
   * 
   * @throws {Error} If status check fails
   */
  async checkStatus(jobId, providerJobId, modelConfig, authContext) {
    throw new Error(`checkStatus() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Retrieve the final results of a completed generation job
   * 
   * @param {string} jobId - Platform job ID (UUID)
   * @param {string} providerJobId - Provider's job ID
   * @param {Object} modelConfig - Model configuration
   * @param {Object} authContext - Authentication context
   * @param {string} authContext.apiKey - API key for this provider
   * 
   * @returns {Promise<Array<Object>>} Array of generated assets
   * @returns {string} return[].url - Direct URL to the generated asset
   * @returns {string} return[].type - Asset type ('image', 'video', 'text')
   * @returns {Object} return[].metadata - Asset metadata
   * @returns {string} [return[].metadata.width] - Image width
   * @returns {string} [return[].metadata.height] - Image height
   * @returns {string} [return[].metadata.format] - File format (e.g., 'png', 'jpg')
   * @returns {number} [return[].metadata.fileSize] - File size in bytes
   * @returns {string} [return[].metadata.prompt] - The prompt used
   * @returns {Object} [return[].metadata.provider] - Provider-specific metadata
   * 
   * @throws {Error} If results retrieval fails or job is not completed
   */
  async getResults(jobId, providerJobId, modelConfig, authContext) {
    throw new Error(`getResults() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Validate adapter configuration
   * Optional method that can be overridden to validate model config
   * 
   * @param {Object} modelConfig - Model configuration to validate
   * @returns {Object} Validation result
   * @returns {boolean} return.valid - Whether config is valid
   * @returns {Array<string>} return.errors - Any validation errors
   */
  validateConfig(modelConfig) {
    const errors = [];
    
    if (!modelConfig.model_id) errors.push('model_id is required');
    if (!modelConfig.adapter_module) errors.push('adapter_module is required');
    if (!modelConfig.api_endpoint) errors.push('api_endpoint is required');
    if (!modelConfig.api_key_type) errors.push('api_key_type is required');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize provider-specific errors to standard format
   * Override this to provide better error messages
   * 
   * @param {Error} error - The original error
   * @returns {Error} Normalized error
   */
  normalizeError(error) {
    return new Error(`${this.constructor.name} error: ${error.message}`);
  }
}

module.exports = BaseAdapter;

