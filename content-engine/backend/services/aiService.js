/**
 * AI Service - Main orchestration layer for AI generation
 * 
 * This service manages the complete lifecycle of AI generation jobs:
 * - Model configuration lookup
 * - API key resolution (global vs user-specific)
 * - Adapter routing
 * - Job tracking and persistence
 * - Result retrieval
 */

const { pool } = require('../../database/config');
const AdapterRegistry = require('./adapters/AdapterRegistry');
const DalleAdapter = require('./adapters/DalleAdapter');

class AIService {
  /**
   * Get all available AI models
   * This is a public, read-only endpoint for the frontend
   * 
   * @param {Object} filters - Optional filters
   * @param {string} [filters.modelType] - Filter by type ('image', 'video', 'text')
   * @param {boolean} [filters.activeOnly=true] - Only return active models
   * @returns {Promise<Array>} Array of model configurations
   */
  async getAvailableModels(filters = {}) {
    const { modelType, activeOnly = true } = filters;
    
    let query = 'SELECT * FROM model_configs WHERE 1=1';
    const params = [];
    
    if (activeOnly) {
      query += ' AND is_active = true';
    }
    
    if (modelType) {
      params.push(modelType);
      query += ` AND model_type = $${params.length}`;
    }
    
    query += ' ORDER BY provider_name';
    
    const result = await pool.query(query, params);
    
    // Don't expose sensitive config options to frontend
    return result.rows.map(model => ({
      modelId: model.model_id,
      providerName: model.provider_name,
      modelType: model.model_type,
      description: model.description,
      apiKeyType: model.api_key_type,
      estimatedTime: model.estimated_time_seconds,
      costPerGeneration: parseFloat(model.cost_per_generation || 0)
    }));
  }

  /**
   * Initiate a new AI generation job
   * 
   * @param {Object} params
   * @param {string} params.modelId - The model to use (from model_configs)
   * @param {string} params.prompt - User's generation prompt
   * @param {Object} [params.options={}] - Generation options
   * @param {string} params.userId - User ID (UUID)
   * @param {string} [params.organizationId] - Organization ID (UUID)
   * @param {string} [params.projectId] - Project ID (UUID)
   * @returns {Promise<Object>} Job details including jobId
   */
  async generateContent(params) {
    const { modelId, prompt, options = {}, userId, organizationId, projectId } = params;
    
    // 1. Fetch model configuration
    const modelConfig = await this._getModelConfig(modelId);
    
    if (!modelConfig) {
      throw new Error(`Model "${modelId}" not found`);
    }
    
    if (!modelConfig.is_active) {
      throw new Error(`Model "${modelId}" is not currently available`);
    }
    
    // 2. Resolve API key (global or user-specific)
    const apiKey = await this._resolveApiKey(modelConfig, userId);
    
    // 3. Get appropriate adapter
    const adapter = AdapterRegistry.getAdapter(modelConfig);
    
    // 4. Create auth context
    const authContext = {
      userId,
      organizationId,
      projectId,
      apiKey
    };
    
    // 5. Call adapter to initiate generation
    console.log(`🚀 [AIService] Initiating generation with ${modelConfig.adapter_module}`);
    
    const adapterResult = await adapter.generateJob(modelConfig, prompt, options, authContext);
    
    // 6. Store job in database
    const jobId = await this._createJobRecord({
      modelId,
      userId,
      organizationId,
      projectId,
      prompt,
      options,
      providerJobId: adapterResult.providerJobId,
      status: adapterResult.status,
      providerMetadata: adapterResult.metadata
    });
    
    console.log(`✅ [AIService] Job created: ${jobId}`);
    
    return {
      jobId,
      status: adapterResult.status,
      estimatedTime: modelConfig.estimated_time_seconds,
      ...adapterResult.metadata
    };
  }

  /**
   * Check the status of an AI generation job
   * 
   * @param {string} jobId - Platform job ID (UUID)
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Job status details
   */
  async checkJobStatus(jobId, userId) {
    // 1. Fetch job from database
    const job = await this._getJob(jobId, userId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // 2. If job is already in a terminal state, return cached status
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return {
        jobId: job.job_id,
        status: job.status,
        progress: job.progress,
        error: job.error_message,
        completedAt: job.completed_at,
        createdAt: job.created_at
      };
    }
    
    // 3. For pending/processing jobs, check with provider
    const modelConfig = await this._getModelConfig(job.model_id);
    const apiKey = await this._resolveApiKey(modelConfig, userId);
    const adapter = AdapterRegistry.getAdapter(modelConfig);
    
    const authContext = { userId, apiKey };
    
    // 4. Query adapter for current status
    const statusResult = await adapter.checkStatus(
      job.job_id,
      job.provider_job_id,
      modelConfig,
      authContext
    );
    
    // 5. Update job record if status changed
    if (statusResult.status !== job.status || statusResult.progress !== job.progress) {
      await this._updateJobStatus(jobId, statusResult.status, statusResult.progress);
    }
    
    return {
      jobId: job.job_id,
      status: statusResult.status,
      progress: statusResult.progress,
      message: statusResult.message,
      createdAt: job.created_at
    };
  }

  /**
   * Get the results of a completed AI generation job
   * 
   * @param {string} jobId - Platform job ID (UUID)
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Job results including generated assets
   */
  async getJobResults(jobId, userId) {
    // 1. Fetch job from database
    const job = await this._getJob(jobId, userId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // 2. Check if job is completed
    if (job.status !== 'completed') {
      throw new Error(`Job is not completed yet. Current status: ${job.status}`);
    }
    
    // 3. Check if results are already cached in DB
    if (job.result_assets && job.result_assets.length > 0) {
      return {
        jobId: job.job_id,
        status: job.status,
        assets: job.result_assets,
        completedAt: job.completed_at,
        prompt: job.prompt
      };
    }
    
    // 4. Fetch results from provider
    const modelConfig = await this._getModelConfig(job.model_id);
    const apiKey = await this._resolveApiKey(modelConfig, userId);
    
    let assets;
    
    // Special handling for synchronous providers like DALL-E
    if (job.provider_metadata?.syncGeneration) {
      // Extract results from metadata
      assets = DalleAdapter.extractResultsFromMetadata(job.provider_metadata);
    } else {
      // Fetch from provider
      const adapter = AdapterRegistry.getAdapter(modelConfig);
      const authContext = { userId, apiKey };
      
      assets = await adapter.getResults(
        job.job_id,
        job.provider_job_id,
        modelConfig,
        authContext
      );
    }
    
    // 5. Cache results in database
    await this._storeJobResults(jobId, assets);
    
    return {
      jobId: job.job_id,
      status: job.status,
      assets,
      completedAt: job.completed_at,
      prompt: job.prompt
    };
  }

  /**
   * Get user's job history
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} [options.limit=20] - Max results
   * @param {number} [options.offset=0] - Pagination offset
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<Object>} Jobs list with pagination
   */
  async getUserJobs(userId, options = {}) {
    const { limit = 20, offset = 0, status } = options;
    
    let query = `
      SELECT 
        job_id, model_id, prompt, status, progress,
        created_at, completed_at, error_message
      FROM ai_generation_jobs
      WHERE user_id = $1
    `;
    
    const params = [userId];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ai_generation_jobs WHERE user_id = $1${status ? ' AND status = $2' : ''}`;
    const countParams = status ? [userId, status] : [userId];
    const countResult = await pool.query(countQuery, countParams);
    
    return {
      jobs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  async _getModelConfig(modelId) {
    const result = await pool.query(
      'SELECT * FROM model_configs WHERE model_id = $1',
      [modelId]
    );
    return result.rows[0] || null;
  }

  async _resolveApiKey(modelConfig, userId) {
    if (modelConfig.api_key_type === 'global') {
      // Use platform-wide API key from environment
      const envVar = `${modelConfig.model_id.toUpperCase().replace(/-/g, '_')}_API_KEY`;
      const apiKey = process.env[envVar];
      
      if (!apiKey) {
        throw new Error(`Global API key not configured for ${modelConfig.model_id}. Set ${envVar} in environment.`);
      }
      
      return apiKey;
      
    } else if (modelConfig.api_key_type === 'user_specific') {
      // Fetch user's API key from database
      const result = await pool.query(
        'SELECT encrypted_api_key FROM user_api_keys WHERE user_id = $1 AND model_id = $2 AND is_valid = true',
        [userId, modelConfig.model_id]
      );
      
      if (result.rows.length === 0) {
        throw new Error(
          `No API key found for ${modelConfig.provider_name}. ` +
          `Please add your API key in Settings.`
        );
      }
      
      // In production, this should be decrypted
      // For now, assuming keys are stored encrypted but readable
      return result.rows[0].encrypted_api_key;
    }
    
    throw new Error(`Invalid api_key_type: ${modelConfig.api_key_type}`);
  }

  async _createJobRecord(jobData) {
    const result = await pool.query(`
      INSERT INTO ai_generation_jobs (
        model_id, user_id, organization_id, project_id,
        prompt, options, provider_job_id, status, provider_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING job_id
    `, [
      jobData.modelId,
      jobData.userId,
      jobData.organizationId || null,
      jobData.projectId || null,
      jobData.prompt,
      JSON.stringify(jobData.options),
      jobData.providerJobId,
      jobData.status,
      JSON.stringify(jobData.providerMetadata)
    ]);
    
    return result.rows[0].job_id;
  }

  async _getJob(jobId, userId) {
    const result = await pool.query(
      'SELECT * FROM ai_generation_jobs WHERE job_id = $1 AND user_id = $2',
      [jobId, userId]
    );
    return result.rows[0] || null;
  }

  async _updateJobStatus(jobId, status, progress) {
    await pool.query(`
      UPDATE ai_generation_jobs
      SET status = $1::VARCHAR, progress = $2, updated_at = CURRENT_TIMESTAMP,
          completed_at = CASE WHEN $1::VARCHAR IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE job_id = $3
    `, [status, progress, jobId]);
  }

  async _storeJobResults(jobId, assets) {
    await pool.query(`
      UPDATE ai_generation_jobs
      SET result_assets = $1, updated_at = CURRENT_TIMESTAMP
      WHERE job_id = $2
    `, [JSON.stringify(assets), jobId]);
  }
}

module.exports = new AIService();

