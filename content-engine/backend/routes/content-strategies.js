// Content Strategies API Routes
// Handles CRUD operations for content strategies

const express = require('express');
const { query } = require('../../database/config');
const { authenticateToken } = require('../../middleware/auth');
const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/content-strategies/:projectId
 * Get all content strategies for a specific project
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    console.log(`🔍 Fetching content strategies for project: ${projectId} by user: ${userId}`);

    // First, check if the project exists
    const projectCheck = await query('SELECT id, name FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) {
      console.log('❌ Project not found:', projectId);
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    console.log('✅ Project found:', projectCheck.rows[0].name);

    // Get all content strategies for the project
    const strategiesResult = await query(`
      SELECT 
        cs.*,
        tp.name as tone_profile_name,
        tp.system_instruction as tone_system_instruction
      FROM content_strategies cs
      LEFT JOIN tone_profiles tp ON cs.tone_id = tp.tone_id
      WHERE cs.project_id = $1
      ORDER BY cs.status, cs.created_at DESC
    `, [projectId]);

    console.log(`📊 Found ${strategiesResult.rows.length} content strategies`);

    res.json({
      success: true,
      data: strategiesResult.rows
    });

  } catch (error) {
    console.error('Content strategies fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content strategies' });
  }
});

/**
 * POST /api/content-strategies
 * Create a new content strategy
 */
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      strategy_name,
      strategy_description,
      post_type_mix_targets,
      status = 'draft',
      tone_id
    } = req.body;

    const userId = req.user.userId;

    console.log(`📝 Creating content strategy: ${strategy_name} for project: ${project_id}`);

    // Validate required fields
    if (!project_id || !strategy_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project ID and strategy name are required' 
      });
    }

    // Check if project exists
    const projectCheck = await query('SELECT id, name FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Create the content strategy
    const result = await query(`
      INSERT INTO content_strategies (
        project_id, 
        strategy_name, 
        strategy_description, 
        post_type_mix_targets, 
        status,
        tone_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      project_id,
      strategy_name,
      strategy_description || '',
      JSON.stringify(post_type_mix_targets || {}),
      status,
      tone_id || null
    ]);

    console.log('✅ Content strategy created:', result.rows[0].strategy_name);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating content strategy:', error);
    res.status(500).json({ success: false, error: 'Failed to create content strategy' });
  }
});

/**
 * PUT /api/content-strategies/:strategyId
 * Update an existing content strategy
 */
router.put('/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;
    const {
      strategy_name,
      strategy_description,
      post_type_mix_targets,
      status,
      tone_id
    } = req.body;

    console.log(`📝 Updating content strategy: ${strategyId}`);

    const result = await query(`
      UPDATE content_strategies
      SET 
        strategy_name = COALESCE($1, strategy_name),
        strategy_description = COALESCE($2, strategy_description),
        post_type_mix_targets = COALESCE($3, post_type_mix_targets),
        status = COALESCE($4, status),
        tone_id = COALESCE($5, tone_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE strategy_id = $6
      RETURNING *
    `, [
      strategy_name,
      strategy_description,
      post_type_mix_targets ? JSON.stringify(post_type_mix_targets) : null,
      status,
      tone_id,
      strategyId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content strategy not found' });
    }

    console.log('✅ Content strategy updated:', result.rows[0].strategy_name);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating content strategy:', error);
    res.status(500).json({ success: false, error: 'Failed to update content strategy' });
  }
});

/**
 * DELETE /api/content-strategies/:strategyId
 * Delete a content strategy
 */
router.delete('/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;

    console.log(`🗑️ Deleting content strategy: ${strategyId}`);

    const result = await query(`
      DELETE FROM content_strategies 
      WHERE strategy_id = $1
      RETURNING strategy_name
    `, [strategyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content strategy not found' });
    }

    console.log('✅ Content strategy deleted:', result.rows[0].strategy_name);

    res.json({
      success: true,
      message: 'Content strategy deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting content strategy:', error);
    res.status(500).json({ success: false, error: 'Failed to delete content strategy' });
  }
});

module.exports = router;
