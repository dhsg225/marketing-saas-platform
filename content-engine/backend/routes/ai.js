/**
 * AI Generation API Routes
 * 
 * These routes implement the universal AI abstraction layer interface:
 * - GET  /api/ai/models - List available AI models
 * - POST /api/ai/generate - Initiate content generation
 * - GET  /api/ai/status/:jobId - Check job status
 * - GET  /api/ai/results/:jobId - Get completed results
 * - GET  /api/ai/jobs - List user's jobs
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');

// ============================================================================
// PUBLIC ROUTES (Read-only model information)
// ============================================================================

/**
 * GET /api/ai/models
 * Get list of available AI models
 * 
 * Query params:
 * - type: Filter by model type ('image', 'video', 'text')
 * - activeOnly: Only show active models (default: true)
 */
router.get('/models', async (req, res) => {
  try {
    const { type, activeOnly } = req.query;
    
    const models = await aiService.getAvailableModels({
      modelType: type,
      activeOnly: activeOnly !== 'false'
    });
    
    res.json({
      success: true,
      models,
      count: models.length
    });
    
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI models',
      message: error.message
    });
  }
});

// ============================================================================
// PROTECTED ROUTES (Require authentication)
// ============================================================================

/**
 * POST /api/ai/generate
 * Initiate a new AI content generation job
 * 
 * Body:
 * {
 *   "modelId": "apiframe-midjourney-v6",
 *   "prompt": "A beautiful sunset over mountains",
 *   "options": {
 *     "aspectRatio": "16:9",
 *     "negativePrompt": "blurry, low quality",
 *     "style": "photorealistic"
 *   },
 *   "projectId": "uuid-optional"
 * }
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { modelId, prompt, options = {}, projectId } = req.body;
    
    // Validation
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'modelId is required'
      });
    }
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'prompt is required and must be a non-empty string'
      });
    }
    
    // Get user info from token
    const userId = req.user.userId || req.user.id;
    const organizationId = req.user.organizationId || req.user.organization_id;
    
    console.log(`🎨 [AI API] Generation request from user ${userId} for model ${modelId}`);
    
    // Initiate generation
    const result = await aiService.generateContent({
      modelId,
      prompt,
      options,
      userId,
      organizationId,
      projectId
    });
    
    res.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      estimatedTime: result.estimatedTime,
      message: 'Generation job created successfully'
    });
    
  } catch (error) {
    console.error('Error initiating generation:', error);
    
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('API key') ? 403 :
                       error.message.includes('invalid') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: 'Generation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/status/:jobId
 * Check the status of a generation job
 */
router.get('/status/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId || req.user.id;
    
    const status = await aiService.checkJobStatus(jobId, userId);
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('Error checking job status:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: 'Status check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/results/:jobId
 * Get the results of a completed generation job
 */
router.get('/results/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId || req.user.id;
    
    const results = await aiService.getJobResults(jobId, userId);
    
    res.json({
      success: true,
      ...results
    });
    
  } catch (error) {
    console.error('Error fetching job results:', error);
    
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('not completed') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: 'Results retrieval failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/jobs
 * Get user's generation job history
 * 
 * Query params:
 * - limit: Max results (default: 20)
 * - offset: Pagination offset (default: 0)
 * - status: Filter by status
 */
router.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { limit, offset, status } = req.query;
    
    const jobs = await aiService.getUserJobs(userId, {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      status
    });
    
    res.json({
      success: true,
      ...jobs
    });
    
  } catch (error) {
    console.error('Error fetching user jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
});

/**
 * DELETE /api/ai/jobs/:jobId
 * Cancel a pending/processing job
 */
router.delete('/jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.userId || req.user.id;
    
    // Update job status to cancelled
    await pool.query(`
      UPDATE ai_generation_jobs
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE job_id = $1 AND user_id = $2 AND status IN ('pending', 'processing')
    `, [jobId, userId]);
    
    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
      message: error.message
    });
  }
});

module.exports = router;

