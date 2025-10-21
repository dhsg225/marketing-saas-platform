// [October 15, 2025] - Talent Messaging Routes (Option D - Week 2)
// Purpose: In-platform messaging for booking communication

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');

// ==================== SEND MESSAGE ====================

/**
 * POST /api/talent/bookings/:bookingId/messages
 * Send message in booking conversation
 */
router.post('/bookings/:bookingId/messages', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { message_text, attachment_urls = [] } = req.body;
    const userId = req.user.userId;

    if (!message_text) {
      return res.status(400).json({
        success: false,
        error: 'message_text is required'
      });
    }

    // Verify access to booking
    const booking = await pool.query(`
      SELECT 
        tb.*,
        tp.user_id as talent_user_id
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      WHERE tb.id = $1 AND (
        tb.booked_by_user_id = $2 OR
        tp.user_id = $2
      )
    `, [bookingId, userId]);

    if (booking.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you are not part of this booking'
      });
    }

    // Determine sender role
    const isClient = booking.rows[0].booked_by_user_id === userId;
    const senderRole = isClient ? 'client' : 'talent';

    // Insert message
    const result = await pool.query(`
      INSERT INTO talent_messages (
        booking_id,
        sender_user_id,
        sender_role,
        message_text,
        has_attachments,
        attachment_urls
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      bookingId,
      userId,
      senderRole,
      message_text,
      attachment_urls.length > 0,
      attachment_urls
    ]);

    console.log('✅ Message sent:', result.rows[0].id);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// ==================== GET MESSAGES ====================

/**
 * GET /api/talent/bookings/:bookingId/messages
 * Get all messages in booking conversation
 */
router.get('/bookings/:bookingId/messages', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;

    // Verify access
    const hasAccess = await pool.query(`
      SELECT 1 FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      WHERE tb.id = $1 AND (
        tb.booked_by_user_id = $2 OR
        tp.user_id = $2
      )
    `, [bookingId, userId]);

    if (hasAccess.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get messages
    const result = await pool.query(`
      SELECT 
        tm.*,
        u.name as sender_name
      FROM talent_messages tm
      JOIN users u ON tm.sender_user_id = u.id
      WHERE tm.booking_id = $1
      ORDER BY tm.created_at ASC
    `, [bookingId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

/**
 * PUT /api/talent/messages/:messageId/read
 * Mark message as read
 */
router.put('/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await pool.query(`
      UPDATE talent_messages
      SET is_read = true, read_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [messageId]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
});

/**
 * GET /api/talent/messages/unread-count
 * Get unread message count for user
 */
router.get('/messages/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM talent_messages tm
      JOIN talent_bookings tb ON tm.booking_id = tb.id
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      WHERE tm.is_read = false 
        AND tm.sender_user_id != $1
        AND (tb.booked_by_user_id = $1 OR tp.user_id = $1)
    `, [userId]);

    res.json({
      success: true,
      unreadCount: parseInt(result.rows[0].count)
    });

  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

module.exports = router;

