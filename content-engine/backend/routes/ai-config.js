// [2025-10-18] - AI Model Configuration API
// Endpoints for managing AI model settings

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  AI_MODELS, 
  MODEL_INFO, 
  getModelConfig, 
  getModelInfo, 
  getAllModels, 
  getModelsByUseCase 
} = require('../config/ai-models');

// GET /api/ai-config/models - Get all available models
router.get('/models', authenticateToken, (req, res) => {
  try {
    const modelsList = Object.entries(AI_MODELS).map(([taskType, config]) => ({
      taskType,
      model: config.model,
      description: config.description,
      max_tokens: config.max_tokens,
      use_case: config.use_case
    }));
    
    res.json({
      success: true,
      data: modelsList
    });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI models'
    });
  }
});

// GET /api/ai-config/current - Get current model configuration
router.get('/current', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      data: AI_MODELS
    });
  } catch (error) {
    console.error('Error fetching current AI config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current configuration'
    });
  }
});

// GET /api/ai-config/use-cases - Get models by use case
router.get('/use-cases', authenticateToken, (req, res) => {
  try {
    // Group models by their use_case
    const useCases = {};
    for (const [taskType, config] of Object.entries(AI_MODELS)) {
      if (!useCases[config.use_case]) {
        useCases[config.use_case] = [];
      }
      useCases[config.use_case].push({ 
        taskType, 
        model: config.model, 
        description: config.description,
        max_tokens: config.max_tokens
      });
    }
    
    res.json({
      success: true,
      data: useCases
    });
  } catch (error) {
    console.error('Error fetching models by use case:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models by use case'
    });
  }
});

// GET /api/ai-config/task/:taskType - Get model config for specific task
router.get('/task/:taskType', authenticateToken, (req, res) => {
  try {
    const { taskType } = req.params;
    const config = getModelConfig(taskType);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching task configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task configuration'
    });
  }
});

module.exports = router;
