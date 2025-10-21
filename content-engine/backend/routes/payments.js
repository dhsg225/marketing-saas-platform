// [October 16, 2025] - Payment Management Routes
// Purpose: Handle manual payments, escrow, and payouts
// Features: Payment verification, escrow release, payout tracking

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');
const paymentService = require('../services/paymentService');

// ==================== CREATE MANUAL PAYMENT ====================

/**
 * POST /api/payments/manual
 * Create a manual payment for a booking
 */
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      paymentMethod,
      clientNotes
    } = req.body;

    // Validate required fields
    if (!bookingId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, amount, paymentMethod'
      });
    }

    // Verify user has access to this booking
    const bookingResult = await pool.query(`
      SELECT tb.*, tp.user_id as talent_user_id
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_profile_id = tp.id
      WHERE tb.id = $1 AND (tb.client_user_id = $2 OR tp.user_id = $2)
    `, [bookingId, req.user.userId]);

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this booking'
      });
    }

    const booking = bookingResult.rows[0];

    // Check if payment already exists
    const existingPayment = await pool.query(`
      SELECT id FROM talent_payments WHERE booking_id = $1
    `, [bookingId]);

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment already exists for this booking'
      });
    }

    // Create manual payment
    const result = await paymentService.createManualPayment(
      bookingId,
      parseFloat(amount),
      paymentMethod,
      clientNotes
    );

    res.status(201).json({
      success: true,
      data: result.data,
      breakdown: result.breakdown,
      message: 'Manual payment created. Awaiting verification.'
    });

  } catch (error) {
    console.error('Error creating manual payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create manual payment'
    });
  }
});

// ==================== VERIFY PAYMENT ====================

/**
 * PUT /api/payments/:paymentId/verify
 * Verify a manual payment (admin only)
 */
router.put('/:paymentId/verify', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verificationNotes } = req.body;

    // Check if user is admin (simplified check)
    const userResult = await pool.query(`
      SELECT role FROM users WHERE id = $1
    `, [req.user.userId]);

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await paymentService.verifyPayment(
      paymentId,
      req.user.userId,
      verificationNotes
    );

    res.json({
      success: true,
      data: result.data,
      message: 'Payment verified and escrow activated'
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
});

// ==================== RELEASE ESCROW ====================

/**
 * PUT /api/payments/:paymentId/release
 * Release escrow payment to talent
 */
router.put('/:paymentId/release', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { releaseReason } = req.body;

    // Check if user is admin or talent
    const paymentResult = await pool.query(`
      SELECT tp.*, tb.talent_profile_id, tb.client_user_id
      FROM talent_payments tp
      JOIN talent_bookings tb ON tp.booking_id = tb.id
      WHERE tp.id = $1
    `, [paymentId]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    // Check access (admin, client, or talent)
    const isAdmin = await pool.query(`
      SELECT role FROM users WHERE id = $1 AND role = 'admin'
    `, [req.user.userId]);

    const hasAccess = isAdmin.rows.length > 0 || 
                     payment.client_user_id === req.user.userId ||
                     payment.talent_profile_id === req.user.userId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await paymentService.releaseEscrowPayment(
      paymentId,
      releaseReason || 'manual_release'
    );

    res.json({
      success: true,
      data: result.data,
      message: 'Escrow payment released to talent'
    });

  } catch (error) {
    console.error('Error releasing escrow payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release escrow payment'
    });
  }
});

// ==================== GET PAYMENT STATUS ====================

/**
 * GET /api/payments/booking/:bookingId
 * Get payment status for a booking
 */
router.get('/booking/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify user has access to this booking
    const bookingResult = await pool.query(`
      SELECT tb.*, tp.user_id as talent_user_id
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_profile_id = tp.id
      WHERE tb.id = $1 AND (tb.client_user_id = $2 OR tp.user_id = $2)
    `, [bookingId, req.user.userId]);

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this booking'
      });
    }

    const paymentStatus = await paymentService.getPaymentStatus(bookingId);

    res.json({
      success: true,
      data: paymentStatus
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment status'
    });
  }
});

// ==================== GET TALENT EARNINGS ====================

/**
 * GET /api/payments/earnings
 * Get talent earnings summary
 */
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get talent profile for user
    const talentResult = await pool.query(`
      SELECT id FROM talent_profiles WHERE user_id = $1
    `, [req.user.userId]);

    if (talentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No talent profile found'
      });
    }

    const talentProfileId = talentResult.rows[0].id;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || new Date();

    const earnings = await paymentService.getTalentEarnings(
      talentProfileId,
      start,
      end
    );

    res.json({
      success: true,
      data: earnings
    });

  } catch (error) {
    console.error('Error getting talent earnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get earnings'
    });
  }
});

// ==================== PROCESS AUTOMATED PAYOUTS ====================

/**
 * POST /api/payments/process-automated
 * Process automated payouts (admin only)
 */
router.post('/process-automated', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query(`
      SELECT role FROM users WHERE id = $1
    `, [req.user.userId]);

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const result = await paymentService.processAutomatedPayouts();

    res.json({
      success: true,
      data: result,
      message: `Processed ${result.processed} automated payouts`
    });

  } catch (error) {
    console.error('Error processing automated payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process automated payouts'
    });
  }
});

// ==================== GET PAYMENT HISTORY ====================

/**
 * GET /api/payments/history
 * Get payment history for user
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        tp.*,
        tb.id as booking_id,
        tb.booking_date,
        tb.special_requirements,
        tprof.display_name as talent_name,
        cu.name as client_name
      FROM talent_payments tp
      JOIN talent_bookings tb ON tp.booking_id = tb.id
      JOIN talent_profiles tprof ON tb.talent_profile_id = tprof.id
      JOIN users cu ON tb.client_user_id = cu.id
      WHERE (tb.client_user_id = $1 OR tprof.user_id = $1)
    `;

    const params = [req.user.userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND tp.payment_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY tp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM talent_payments tp
      JOIN talent_bookings tb ON tp.booking_id = tb.id
      JOIN talent_profiles tprof ON tb.talent_profile_id = tprof.id
      WHERE (tb.client_user_id = $1 OR tprof.user_id = $1)
      ${status ? 'AND tp.payment_status = $2' : ''}
    `;
    const countParams = status ? [req.user.userId, status] : [req.user.userId];
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history'
    });
  }
});

module.exports = router;
