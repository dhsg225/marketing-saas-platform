// [October 15, 2025] - Talent Booking Routes (Week 2)
// Purpose: Complete booking system with request/accept/decline workflow
// Manual payments mode - Stripe integration comes in Week 3

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');
const stripeService = require('../services/stripeService');

// ==================== HELPER FUNCTIONS ====================

async function verifyProjectAccess(userId, projectId) {
  const result = await pool.query(`
    SELECT p.id, p.organization_id, c.id as client_id
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    JOIN user_organizations uo ON c.organization_id = uo.organization_id
    WHERE p.id = $1 AND uo.user_id = $2
  `, [projectId, userId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function verifyTalentOwnership(userId, talentId) {
  const result = await pool.query(
    'SELECT id FROM talent_profiles WHERE id = $1 AND user_id = $2',
    [talentId, userId]
  );
  return result.rows.length > 0;
}

// ==================== CREATE BOOKING ====================

/**
 * POST /api/talent/bookings
 * Create a booking request
 */
router.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const {
      talent_id,
      project_id,
      service_id,
      title,
      description,
      requested_date,
      start_time,
      end_time,
      duration_hours,
      location_address,
      location_city,
      location_state,
      is_remote = false,
      quoted_price,
      special_requirements,
      deliverable_format,
      usage_rights
    } = req.body;

    const userId = req.user.userId;

    // Validation
    if (!talent_id || !project_id || !title || !requested_date || !quoted_price) {
      return res.status(400).json({
        success: false,
        error: 'talent_id, project_id, title, requested_date, and quoted_price are required'
      });
    }

    // Verify project access
    const project = await verifyProjectAccess(userId, project_id);
    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you do not have access to this project'
      });
    }

    // Calculate platform fees
    const fees = stripeService.calculatePlatformFee(parseFloat(quoted_price));

    // Create booking
    const result = await pool.query(`
      INSERT INTO talent_bookings (
        talent_id,
        project_id,
        organization_id,
        booked_by_user_id,
        service_id,
        title,
        description,
        requested_date,
        start_time,
        end_time,
        duration_hours,
        location_address,
        location_city,
        location_state,
        is_remote,
        quoted_price,
        final_price,
        platform_fee_percentage,
        platform_fee_amount,
        stripe_fee_amount,
        talent_payout_amount,
        special_requirements,
        deliverable_format,
        usage_rights,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $16, $17, $18, $19,
        $20, $21, $22, $23, 'pending'
      ) RETURNING *
    `, [
      talent_id, project_id, project.organization_id, userId, service_id,
      title, description, requested_date, start_time, end_time,
      duration_hours, location_address, location_city, location_state, is_remote,
      quoted_price, fees.platformFeePercentage, fees.platformFeeAmount,
      fees.stripeFeeAmount, fees.talentPayoutAmount, special_requirements,
      deliverable_format, usage_rights
    ]);

    console.log('✅ Booking created:', result.rows[0].booking_number);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Booking request sent to talent. Waiting for acceptance.'
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      details: error.message
    });
  }
});

// ==================== GET BOOKINGS ====================

/**
 * GET /api/talent/bookings
 * List bookings (filtered by role - client or talent)
 */
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const { role = 'client', status, project_id, talent_id, page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    let query = `
      SELECT 
        tb.*,
        tp.display_name as talent_name,
        tp.profile_image_url as talent_image,
        p.name as project_name
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      JOIN projects p ON tb.project_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (role === 'client') {
      // Show bookings for projects user has access to
      query += ` AND tb.project_id IN (
        SELECT p.id FROM projects p
        JOIN clients c ON p.client_id = c.id
        JOIN user_organizations uo ON c.organization_id = uo.organization_id
        WHERE uo.user_id = $${paramIndex}
      )`;
      params.push(userId);
      paramIndex++;
    } else if (role === 'talent') {
      // Show bookings for user's talent profile
      query += ` AND tb.talent_id IN (
        SELECT id FROM talent_profiles WHERE user_id = $${paramIndex}
      )`;
      params.push(userId);
      paramIndex++;
    }

    if (status) {
      query += ` AND tb.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (project_id) {
      query += ` AND tb.project_id = $${paramIndex}`;
      params.push(project_id);
      paramIndex++;
    }

    if (talent_id) {
      query += ` AND tb.talent_id = $${paramIndex}`;
      params.push(talent_id);
      paramIndex++;
    }

    query += ` ORDER BY tb.created_at DESC`;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('List bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
});

/**
 * GET /api/talent/bookings/:id
 * Get single booking details
 */
router.get('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT 
        tb.*,
        tp.display_name as talent_name,
        tp.email as talent_email,
        tp.phone as talent_phone,
        tp.profile_image_url as talent_image,
        p.name as project_name,
        ts.service_name,
        COUNT(DISTINCT bd.id) as deliverables_count
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      JOIN projects p ON tb.project_id = p.id
      LEFT JOIN talent_services ts ON tb.service_id = ts.id
      LEFT JOIN booking_deliverables bd ON tb.id = bd.booking_id
      WHERE tb.id = $1
      GROUP BY tb.id, tp.id, p.id, ts.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = result.rows[0];

    // Verify access
    const hasAccess = await pool.query(`
      SELECT 1 FROM talent_bookings tb
      WHERE tb.id = $1 AND (
        tb.booked_by_user_id = $2 OR
        tb.talent_id IN (SELECT id FROM talent_profiles WHERE user_id = $2) OR
        tb.project_id IN (
          SELECT p.id FROM projects p
          JOIN clients c ON p.client_id = c.id
          JOIN user_organizations uo ON c.organization_id = uo.organization_id
          WHERE uo.user_id = $2
        )
      )
    `, [id, userId]);

    if (hasAccess.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking'
    });
  }
});

// ==================== TALENT ACTIONS ====================

/**
 * POST /api/talent/bookings/:id/accept
 * Talent accepts booking
 */
router.post('/bookings/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify talent ownership
    const booking = await pool.query(
      'SELECT * FROM talent_bookings WHERE id = $1',
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, booking.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you are not the talent for this booking'
      });
    }

    // Update booking status
    const result = await pool.query(`
      UPDATE talent_bookings
      SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be accepted (may already be accepted or cancelled)'
      });
    }

    console.log('✅ Booking accepted:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Booking accepted! Client will be notified.'
    });

  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept booking'
    });
  }
});

/**
 * POST /api/talent/bookings/:id/decline
 * Talent declines booking
 */
router.post('/bookings/:id/decline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    // Verify talent ownership
    const booking = await pool.query(
      'SELECT * FROM talent_bookings WHERE id = $1',
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, booking.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update booking status
    const result = await pool.query(`
      UPDATE talent_bookings
      SET 
        status = 'declined',
        cancellation_reason = $1,
        cancelled_at = NOW(),
        cancelled_by = $2,
        updated_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `, [reason, userId, id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be declined'
      });
    }

    console.log('⚠️ Booking declined:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Booking declined. Client will be notified.'
    });

  } catch (error) {
    console.error('Decline booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline booking'
    });
  }
});

/**
 * POST /api/talent/bookings/:id/complete
 * Talent marks work as complete
 */
router.post('/bookings/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify talent ownership
    const booking = await pool.query(
      'SELECT * FROM talent_bookings WHERE id = $1',
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, booking.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Update booking status
    const result = await pool.query(`
      UPDATE talent_bookings
      SET 
        status = 'review_pending',
        delivered_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND status IN ('paid', 'in_progress')
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be marked complete at this stage'
      });
    }

    console.log('✅ Booking marked complete:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Work marked complete. Waiting for client approval.'
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark booking complete'
    });
  }
});

// ==================== COUNTER-OFFER ====================

/**
 * POST /api/talent/bookings/:id/counter-offer
 * Talent sends counter-offer with different price
 */
router.post('/bookings/:id/counter-offer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { counter_price, counter_notes } = req.body;
    const userId = req.user.userId;

    if (!counter_price) {
      return res.status(400).json({
        success: false,
        error: 'counter_price is required'
      });
    }

    // Verify talent ownership
    const booking = await pool.query(
      'SELECT * FROM talent_bookings WHERE id = $1',
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, booking.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Calculate new fees
    const fees = stripeService.calculatePlatformFee(parseFloat(counter_price));

    // Update booking with counter-offer
    const result = await pool.query(`
      UPDATE talent_bookings
      SET 
        final_price = $1,
        platform_fee_percentage = $2,
        platform_fee_amount = $3,
        stripe_fee_amount = $4,
        talent_payout_amount = $5,
        status = 'accepted',
        accepted_at = NOW(),
        special_requirements = COALESCE(special_requirements, '') || E'\n\nTalent Counter-Offer: ' || $6,
        updated_at = NOW()
      WHERE id = $7 AND status = 'pending'
      RETURNING *
    `, [
      counter_price,
      fees.platformFeePercentage,
      fees.platformFeeAmount,
      fees.stripeFeeAmount,
      fees.talentPayoutAmount,
      counter_notes || `New price: $${counter_price}`,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot send counter-offer at this stage'
      });
    }

    console.log('💰 Counter-offer sent:', id, '- New price:', counter_price);

    res.json({
      success: true,
      data: result.rows[0],
      message: `Counter-offer sent: $${counter_price}. Client will be notified.`
    });

  } catch (error) {
    console.error('Counter-offer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send counter-offer'
    });
  }
});

// ==================== CLIENT ACTIONS ====================

/**
 * POST /api/talent/bookings/:id/approve
 * Client approves deliverables
 */
router.post('/bookings/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify client access
    const booking = await pool.query(`
      SELECT tb.* FROM talent_bookings tb
      JOIN projects p ON tb.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE tb.id = $1 AND uo.user_id = $2
    `, [id, userId]);

    if (booking.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied or booking not found'
      });
    }

    // Update booking status
    const result = await pool.query(`
      UPDATE talent_bookings
      SET 
        status = 'completed',
        client_approved = true,
        client_approved_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND status = 'review_pending'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be approved at this stage'
      });
    }

    console.log('✅ Booking approved and completed:', id);

    // TODO: Trigger payout to talent (Week 3 - Stripe integration)
    // TODO: Generate invoice (Week 5)

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Booking approved and completed! Talent will receive payment.'
    });

  } catch (error) {
    console.error('Approve booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve booking'
    });
  }
});

/**
 * POST /api/talent/bookings/:id/cancel
 * Cancel booking (client or talent)
 */
router.post('/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    // Verify access (client or talent)
    const booking = await pool.query(`
      SELECT tb.* FROM talent_bookings tb
      WHERE tb.id = $1 AND (
        tb.booked_by_user_id = $2 OR
        tb.talent_id IN (SELECT id FROM talent_profiles WHERE user_id = $2)
      )
    `, [id, userId]);

    if (booking.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied or booking not found'
      });
    }

    // Update booking status
    const result = await pool.query(`
      UPDATE talent_bookings
      SET 
        status = 'cancelled',
        cancellation_reason = $1,
        cancelled_at = NOW(),
        cancelled_by = $2,
        updated_at = NOW()
      WHERE id = $3 AND status NOT IN ('completed', 'cancelled', 'refunded')
      RETURNING *
    `, [reason, userId, id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be cancelled'
      });
    }

    console.log('⚠️ Booking cancelled:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking'
    });
  }
});

// ==================== DELIVERABLES ====================

/**
 * POST /api/talent/bookings/:id/deliverables
 * Upload deliverable (links to asset library)
 */
router.post('/bookings/:id/deliverables', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { asset_id, file_name, file_url, file_type, file_size_bytes, talent_notes } = req.body;
    const userId = req.user.userId;

    // Verify talent ownership
    const booking = await pool.query(
      'SELECT * FROM talent_bookings WHERE id = $1',
      [id]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, booking.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Add deliverable
    const result = await pool.query(`
      INSERT INTO booking_deliverables (
        booking_id, asset_id, file_name, file_url, file_type, file_size_bytes, talent_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, asset_id, file_name, file_url, file_type, file_size_bytes, talent_notes]);

    // Update booking deliverables count
    await pool.query(`
      UPDATE talent_bookings
      SET delivered_assets_count = delivered_assets_count + 1, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    console.log('✅ Deliverable added to booking:', id);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Deliverable uploaded successfully'
    });

  } catch (error) {
    console.error('Add deliverable error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add deliverable'
    });
  }
});

/**
 * GET /api/talent/bookings/:id/deliverables
 * Get all deliverables for a booking
 */
router.get('/bookings/:id/deliverables', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM booking_deliverables
      WHERE booking_id = $1
      ORDER BY uploaded_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get deliverables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deliverables'
    });
  }
});

module.exports = router;

