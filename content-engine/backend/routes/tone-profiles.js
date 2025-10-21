const express = require('express');
const { pool } = require('../../database/config');
const { authenticateToken } = require('../../middleware/auth');
const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/tone-profiles
 * Get all tone profiles (user's own + public profiles)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      `SELECT 
        tp.*,
        u.name as owner_name,
        u.email as owner_email
      FROM tone_profiles tp
      LEFT JOIN users u ON tp.owner_id = u.id
      WHERE tp.owner_id = $1 OR tp.is_public = true
      ORDER BY tp.created_at DESC`,
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching tone profiles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tone-profiles/:id
 * Get a single tone profile by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const result = await pool.query(
      `SELECT 
        tp.*,
        u.name as owner_name,
        u.email as owner_email
      FROM tone_profiles tp
      LEFT JOIN users u ON tp.owner_id = u.id
      WHERE tp.tone_id = $1 AND (tp.owner_id = $2 OR tp.is_public = true)`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tone profile not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching tone profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tone-profiles
 * Create a new tone profile
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, system_instruction, is_public } = req.body;
    const userId = req.user.userId;
    
    console.log('🔍 Creating tone profile:', { name, userId, user: req.user });
    
    // Validation
    if (!name || !system_instruction) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and system_instruction are required' 
      });
    }
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO tone_profiles 
        (name, description, system_instruction, owner_id, is_public, is_active) 
      VALUES ($1, $2, $3, $4, $5, true) 
      RETURNING *`,
      [name, description || null, system_instruction, userId, is_public || false]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating tone profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/tone-profiles/:id
 * Update an existing tone profile
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, system_instruction, is_public, is_active } = req.body;
    const userId = req.user.userId;
    
    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM tone_profiles WHERE tone_id = $1',
      [id]
    );
    
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tone profile not found' });
    }
    
    if (ownerCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this tone profile' });
    }
    
    // Update the profile
    const result = await pool.query(
      `UPDATE tone_profiles 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        system_instruction = COALESCE($3, system_instruction),
        is_public = COALESCE($4, is_public),
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE tone_id = $6
      RETURNING *`,
      [name, description, system_instruction, is_public, is_active, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating tone profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/tone-profiles/:id
 * Delete a tone profile
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM tone_profiles WHERE tone_id = $1',
      [id]
    );
    
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tone profile not found' });
    }
    
    if (ownerCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this tone profile' });
    }
    
    // Check if tone profile is in use by any content strategies
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM content_strategies WHERE tone_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Cannot delete tone profile - it is currently in use by content strategies' 
      });
    }
    
    await pool.query('DELETE FROM tone_profiles WHERE tone_id = $1', [id]);
    
    res.json({ success: true, message: 'Tone profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting tone profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tone-profiles/:id/increment-usage
 * Increment usage count when tone profile is used
 */
router.post('/:id/increment-usage', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE tone_profiles 
      SET 
        usage_count = usage_count + 1,
        last_used_at = CURRENT_TIMESTAMP
      WHERE tone_id = $1
      RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tone profile not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tone-profiles/suggest
 * AI-powered tone profile suggestion based on industry/style keywords
 */
router.post('/suggest', async (req, res) => {
  try {
    const { industry, style_keywords, tone_description } = req.body;
    
    // Placeholder for AI integration
    // In production, this would call an LLM to generate a system_instruction
    const suggestions = {
      system_instruction: `You are a ${style_keywords || 'professional'} content writer specializing in ${industry || 'general'} content. ${tone_description || 'Write in a clear, engaging style that resonates with the target audience.'}\n\nKey guidelines:\n- Maintain a ${style_keywords || 'professional'} tone throughout\n- Use industry-specific terminology appropriately\n- Keep content engaging and actionable\n- Adapt style based on the content type and platform`,
      example_phrases: [
        `As a leader in ${industry || 'the industry'}...`,
        'Let me share some insights...',
        'Here\'s what you need to know...'
      ]
    };
    
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Error generating tone suggestion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
