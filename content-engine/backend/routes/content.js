const express = require('express');
const router = express.Router();
const contentService = require('../services/contentService');
const { pool } = require('../../database/config');

// Generate content endpoint
router.post('/generate', async (req, res) => {
  try {
    const { type, industry, topic, tone, length, toneProfileId } = req.body;

    // Validate required fields
    if (!type || !industry || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, industry, topic'
      });
    }

    // [Oct 12, 2025 11:15 AM] - Added tone profile support: Fetch system_instruction if toneProfileId provided
    let systemInstruction = null;
    if (toneProfileId) {
      try {
        const toneProfileResult = await pool.query(
          'SELECT system_instruction FROM tone_profiles WHERE tone_id = $1 AND is_active = true',
          [toneProfileId]
        );
        if (toneProfileResult.rows.length > 0) {
          systemInstruction = toneProfileResult.rows[0].system_instruction;
          console.log('✅ Using tone profile:', toneProfileId);
        }
      } catch (toneError) {
        console.error('❌ Failed to fetch tone profile:', toneError);
        // Continue without tone profile if fetch fails
      }
    }

    // Generate content
    const content = await contentService.generateContent({
      type,
      industry,
      topic,
      tone,
      length,
      systemInstruction
    });

    res.json({
      success: true,
      content,
      metadata: {
        type,
        industry,
        topic,
        tone,
        length,
        toneProfileId: toneProfileId || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate content'
    });
  }
});

// Enhance prompt for AI image generation
router.post('/enhance-prompt', async (req, res) => {
  try {
    const { prompt, type, model } = req.body;

    if (!prompt || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt, type'
      });
    }

    // Create enhanced prompt based on model type
    let enhancedPrompt = prompt;

    if (type === 'image' && model === 'midjourney') {
      // Enhance prompt for Midjourney with professional keywords
      enhancedPrompt = await contentService.enhanceImagePrompt(prompt);
    }

    res.json({
      success: true,
      enhancedPrompt,
      originalPrompt: prompt,
      model: model || 'midjourney'
    });
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance prompt'
    });
  }
});

// Get content history
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await contentService.getContentHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Content history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content history'
    });
  }
});

// Save content manually
router.post('/save', async (req, res) => {
  try {
    const { type, industry, topic, content, tone, length } = req.body;

    if (!type || !industry || !topic || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, industry, topic, content'
      });
    }

    await contentService.saveContent({
      type,
      industry,
      topic,
      content,
      tone: tone || 'professional',
      length: length || 'medium'
    });

    res.json({
      success: true,
      message: 'Content saved successfully'
    });
  } catch (error) {
    console.error('Save content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save content'
    });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await contentService.getAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// Get content by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../database/config');
    
    const result = await query(
      'SELECT * FROM content_pieces WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content'
    });
  }
});

// Update content
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, topic } = req.body;
    const { query } = require('../database/config');
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const result = await query(
      'UPDATE content_pieces SET content = $1, topic = COALESCE($2, topic), updated_at = NOW() WHERE id = $3 RETURNING *',
      [content, topic, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Content updated successfully'
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update content'
    });
  }
});

// Delete content
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../database/config');
    
    const result = await query(
      'DELETE FROM content_pieces WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete content'
    });
  }
});

module.exports = router;
