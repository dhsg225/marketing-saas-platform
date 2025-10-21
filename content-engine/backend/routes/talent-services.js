// [October 15, 2025] - Talent Services Management Routes
// Purpose: CRUD operations for services offered by talent (photography packages, rates, etc.)

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');

// ==================== HELPER FUNCTIONS ====================

async function verifyTalentOwnership(userId, talentId) {
  const result = await pool.query(
    'SELECT id FROM talent_profiles WHERE id = $1 AND user_id = $2',
    [talentId, userId]
  );
  return result.rows.length > 0;
}

// ==================== GET SERVICES ====================

/**
 * GET /api/talent/profiles/:talentId/services
 * Get all services for a talent
 */
router.get('/profiles/:talentId/services', async (req, res) => {
  try {
    const { talentId } = req.params;
    const { is_active } = req.query;

    let query = 'SELECT * FROM talent_services WHERE talent_id = $1';
    const params = [talentId];

    if (is_active === 'true') {
      query += ' AND is_active = true';
    }

    query += ' ORDER BY base_price ASC, created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services'
    });
  }
});

// ==================== CREATE SERVICE ====================

/**
 * POST /api/talent/profiles/:talentId/services
 * Add a service
 */
router.post('/profiles/:talentId/services', authenticateToken, async (req, res) => {
  try {
    const { talentId } = req.params;
    const userId = req.user.userId;

    const isOwner = await verifyTalentOwnership(userId, talentId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const {
      service_name,
      description,
      service_type,
      pricing_model,
      base_price,
      min_price,
      max_price,
      package_includes,
      typical_turnaround_days,
      rush_available = false,
      rush_fee_percentage,
      is_active = true
    } = req.body;

    // Validation
    if (!service_name || !pricing_model) {
      return res.status(400).json({
        success: false,
        error: 'service_name and pricing_model are required'
      });
    }

    if (!['hourly', 'fixed', 'custom', 'package'].includes(pricing_model)) {
      return res.status(400).json({
        success: false,
        error: 'pricing_model must be: hourly, fixed, custom, or package'
      });
    }

    const result = await pool.query(`
      INSERT INTO talent_services (
        talent_id, service_name, description, service_type,
        pricing_model, base_price, min_price, max_price,
        package_includes, typical_turnaround_days,
        rush_available, rush_fee_percentage, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      talentId, service_name, description, service_type,
      pricing_model, base_price, min_price, max_price,
      JSON.stringify(package_includes), typical_turnaround_days,
      rush_available, rush_fee_percentage, is_active
    ]);

    console.log('✅ Service added:', result.rows[0].id);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Service added successfully'
    });

  } catch (error) {
    console.error('Add service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add service'
    });
  }
});

// ==================== UPDATE SERVICE ====================

/**
 * PUT /api/talent/services/:id
 * Update service
 */
router.put('/services/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const service = await pool.query(
      'SELECT talent_id FROM talent_services WHERE id = $1',
      [id]
    );

    if (service.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, service.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const {
      service_name,
      description,
      service_type,
      pricing_model,
      base_price,
      min_price,
      max_price,
      package_includes,
      typical_turnaround_days,
      rush_available,
      rush_fee_percentage,
      is_active
    } = req.body;

    const result = await pool.query(`
      UPDATE talent_services SET
        service_name = COALESCE($1, service_name),
        description = COALESCE($2, description),
        service_type = COALESCE($3, service_type),
        pricing_model = COALESCE($4, pricing_model),
        base_price = COALESCE($5, base_price),
        min_price = COALESCE($6, min_price),
        max_price = COALESCE($7, max_price),
        package_includes = COALESCE($8, package_includes),
        typical_turnaround_days = COALESCE($9, typical_turnaround_days),
        rush_available = COALESCE($10, rush_available),
        rush_fee_percentage = COALESCE($11, rush_fee_percentage),
        is_active = COALESCE($12, is_active),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      service_name, description, service_type, pricing_model,
      base_price, min_price, max_price,
      package_includes ? JSON.stringify(package_includes) : null,
      typical_turnaround_days, rush_available, rush_fee_percentage,
      is_active, id
    ]);

    console.log('✅ Service updated:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Service updated successfully'
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service'
    });
  }
});

// ==================== DELETE SERVICE ====================

/**
 * DELETE /api/talent/services/:id
 * Delete service
 */
router.delete('/services/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const service = await pool.query(
      'SELECT talent_id FROM talent_services WHERE id = $1',
      [id]
    );

    if (service.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, service.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await pool.query('DELETE FROM talent_services WHERE id = $1', [id]);

    console.log('✅ Service deleted:', id);

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service'
    });
  }
});

module.exports = router;

