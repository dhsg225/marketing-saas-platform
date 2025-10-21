// [October 15, 2025] - Talent Portfolio Management Routes
// Purpose: CRUD operations for talent portfolio items (images/videos of past work)

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');

// ==================== HELPER FUNCTIONS ====================

/**
 * Verify user owns the talent profile
 */
async function verifyTalentOwnership(userId, talentId) {
  const result = await pool.query(
    'SELECT id FROM talent_profiles WHERE id = $1 AND user_id = $2',
    [talentId, userId]
  );
  return result.rows.length > 0;
}

// ==================== GET PORTFOLIO ====================

/**
 * GET /api/talent/profiles/:talentId/portfolio
 * Get all portfolio items for a talent
 */
router.get('/profiles/:talentId/portfolio', async (req, res) => {
  try {
    const { talentId } = req.params;
    const { is_public } = req.query;

    let query = 'SELECT * FROM talent_portfolios WHERE talent_id = $1';
    const params = [talentId];

    if (is_public === 'true') {
      query += ' AND is_public = true';
    }

    query += ' ORDER BY is_featured DESC, display_order ASC, created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio'
    });
  }
});

/**
 * GET /api/talent/portfolio/:id
 * Get single portfolio item
 */
router.get('/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM talent_portfolios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get portfolio item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio item'
    });
  }
});

// ==================== CREATE PORTFOLIO ITEM ====================

/**
 * POST /api/talent/profiles/:talentId/portfolio
 * Add a portfolio item
 */
router.post('/profiles/:talentId/portfolio', authenticateToken, async (req, res) => {
  try {
    const { talentId } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const isOwner = await verifyTalentOwnership(userId, talentId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you do not own this talent profile'
      });
    }

    const {
      title,
      description,
      media_type,
      media_url,
      thumbnail_url,
      project_type,
      tags = [],
      display_order = 0,
      is_featured = false,
      is_public = true
    } = req.body;

    // Validation
    if (!title || !media_type || !media_url) {
      return res.status(400).json({
        success: false,
        error: 'title, media_type, and media_url are required'
      });
    }

    if (!['image', 'video', 'pdf'].includes(media_type)) {
      return res.status(400).json({
        success: false,
        error: 'media_type must be: image, video, or pdf'
      });
    }

    const result = await pool.query(`
      INSERT INTO talent_portfolios (
        talent_id,
        title,
        description,
        media_type,
        media_url,
        thumbnail_url,
        project_type,
        tags,
        display_order,
        is_featured,
        is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      talentId, title, description, media_type, media_url,
      thumbnail_url, project_type, tags, display_order,
      is_featured, is_public
    ]);

    console.log('✅ Portfolio item added:', result.rows[0].id);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Portfolio item added successfully'
    });

  } catch (error) {
    console.error('Add portfolio item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add portfolio item'
    });
  }
});

// ==================== UPDATE PORTFOLIO ITEM ====================

/**
 * PUT /api/talent/portfolio/:id
 * Update portfolio item
 */
router.put('/portfolio/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get portfolio item to verify ownership
    const portfolioItem = await pool.query(
      'SELECT talent_id FROM talent_portfolios WHERE id = $1',
      [id]
    );

    if (portfolioItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, portfolioItem.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const {
      title,
      description,
      media_type,
      media_url,
      thumbnail_url,
      project_type,
      tags,
      display_order,
      is_featured,
      is_public
    } = req.body;

    const result = await pool.query(`
      UPDATE talent_portfolios SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        media_type = COALESCE($3, media_type),
        media_url = COALESCE($4, media_url),
        thumbnail_url = COALESCE($5, thumbnail_url),
        project_type = COALESCE($6, project_type),
        tags = COALESCE($7, tags),
        display_order = COALESCE($8, display_order),
        is_featured = COALESCE($9, is_featured),
        is_public = COALESCE($10, is_public),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      title, description, media_type, media_url, thumbnail_url,
      project_type, tags, display_order, is_featured, is_public, id
    ]);

    console.log('✅ Portfolio item updated:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Portfolio item updated successfully'
    });

  } catch (error) {
    console.error('Update portfolio item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update portfolio item'
    });
  }
});

// ==================== DELETE PORTFOLIO ITEM ====================

/**
 * DELETE /api/talent/portfolio/:id
 * Delete portfolio item
 */
router.delete('/portfolio/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Get portfolio item to verify ownership
    const portfolioItem = await pool.query(
      'SELECT talent_id FROM talent_portfolios WHERE id = $1',
      [id]
    );

    if (portfolioItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, portfolioItem.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await pool.query('DELETE FROM talent_portfolios WHERE id = $1', [id]);

    console.log('✅ Portfolio item deleted:', id);

    res.json({
      success: true,
      message: 'Portfolio item deleted successfully'
    });

  } catch (error) {
    console.error('Delete portfolio item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete portfolio item'
    });
  }
});

// ==================== BULK OPERATIONS ====================

/**
 * PUT /api/talent/profiles/:talentId/portfolio/reorder
 * Reorder portfolio items
 */
router.put('/profiles/:talentId/portfolio/reorder', authenticateToken, async (req, res) => {
  try {
    const { talentId } = req.params;
    const { items } = req.body; // Array of {id, display_order}
    const userId = req.user.userId;

    const isOwner = await verifyTalentOwnership(userId, talentId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'items must be an array of {id, display_order}'
      });
    }

    // Update all items in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        await client.query(
          'UPDATE talent_portfolios SET display_order = $1, updated_at = NOW() WHERE id = $2 AND talent_id = $3',
          [item.display_order, item.id, talentId]
        );
      }

      await client.query('COMMIT');

      console.log('✅ Portfolio reordered for talent:', talentId);

      res.json({
        success: true,
        message: 'Portfolio reordered successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reorder portfolio error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder portfolio'
    });
  }
});

module.exports = router;

