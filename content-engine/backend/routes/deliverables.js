// [October 16, 2025] - Deliverables Management Routes
// Purpose: Handle file uploads, deliverable review, and version control
// Features: File uploads to Bunny.net, approval workflow, revision tracking

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// ==================== UPLOAD DELIVERABLE ====================

/**
 * POST /api/deliverables/upload
 * Upload a deliverable for a booking
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { bookingId, title, description } = req.body;
    const file = req.file;

    if (!file || !bookingId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: file, bookingId, title'
      });
    }

    // Verify user is the talent for this booking
    const bookingResult = await pool.query(`
      SELECT tb.*, tp.user_id as talent_user_id
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      WHERE tb.id = $1
    `, [bookingId]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookingResult.rows[0];
    if (booking.talent_user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the talent can upload deliverables'
      });
    }

    // Upload file to Bunny.net
    const bunnyUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/deliverables/${bookingId}/${Date.now()}-${file.originalname}`;
    
    await axios.put(bunnyUrl, file.buffer, {
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY,
        'Content-Type': file.mimetype
      }
    });

    const fileUrl = `https://${process.env.BUNNY_CDN_HOSTNAME}/deliverables/${bookingId}/${Date.now()}-${file.originalname}`;

    // Create deliverable record
    const result = await pool.query(`
      INSERT INTO booking_deliverables (
        booking_id, talent_id, title, description,
        file_url, file_name, file_type, file_size_bytes,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      bookingId,
      booking.talent_id,
      title,
      description || null,
      fileUrl,
      file.originalname,
      file.mimetype,
      file.size,
      'pending_review'
    ]);

    // Update booking status and delivered count
    await pool.query(`
      UPDATE talent_bookings
      SET 
        delivered_assets_count = COALESCE(delivered_assets_count, 0) + 1,
        status = CASE 
          WHEN status = 'in_progress' THEN 'review_pending'
          ELSE status
        END,
        delivered_at = CASE
          WHEN delivered_at IS NULL THEN NOW()
          ELSE delivered_at
        END,
        updated_at = NOW()
      WHERE id = $1
    `, [bookingId]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Deliverable uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading deliverable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload deliverable'
    });
  }
});

// ==================== GET DELIVERABLES FOR BOOKING ====================

/**
 * GET /api/deliverables/booking/:bookingId
 * Get all deliverables for a booking
 */
router.get('/booking/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify user has access to this booking
    const bookingResult = await pool.query(`
      SELECT tb.*, tp.user_id as talent_user_id
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      WHERE tb.id = $1 AND (tb.booked_by_user_id = $2 OR tp.user_id = $2)
    `, [bookingId, req.user.userId]);

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this booking'
      });
    }

    const result = await pool.query(`
      SELECT 
        bd.*,
        tp.display_name as talent_name,
        ru.name as reviewed_by_name
      FROM booking_deliverables bd
      JOIN talent_profiles tp ON bd.talent_id = tp.id
      LEFT JOIN users ru ON bd.reviewed_by = ru.id
      WHERE bd.booking_id = $1
      ORDER BY bd.version ASC, bd.created_at DESC
    `, [bookingId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting deliverables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deliverables'
    });
  }
});

// ==================== REVIEW DELIVERABLE ====================

/**
 * PUT /api/deliverables/:id/review
 * Review a deliverable (approve/reject/request revision)
 */
router.put('/:id/review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected', 'revision_requested'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: approved, rejected, or revision_requested'
      });
    }

    // Verify user is the client for this booking
    const deliverableResult = await pool.query(`
      SELECT bd.*, tb.booked_by_user_id
      FROM booking_deliverables bd
      JOIN talent_bookings tb ON bd.booking_id = tb.id
      WHERE bd.id = $1
    `, [id]);

    if (deliverableResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deliverable not found'
      });
    }

    const deliverable = deliverableResult.rows[0];
    if (deliverable.booked_by_user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the client can review deliverables'
      });
    }

    // Update deliverable status
    const result = await pool.query(`
      UPDATE booking_deliverables
      SET 
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        review_notes = $3,
        is_final = CASE WHEN $1 = 'approved' THEN true ELSE false END,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, req.user.userId, reviewNotes, id]);

    // If approved, check if all deliverables are approved
    if (status === 'approved') {
      const bookingDeliverables = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
        FROM booking_deliverables
        WHERE booking_id = $1
      `, [deliverable.booking_id]);

      const stats = bookingDeliverables.rows[0];
      
      // If all deliverables approved, mark booking as completed
      if (parseInt(stats.total) === parseInt(stats.approved)) {
        await pool.query(`
          UPDATE talent_bookings
          SET 
            client_approved = true,
            client_approved_at = NOW(),
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `, [deliverable.booking_id]);
      }
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Deliverable ${status}`
    });

  } catch (error) {
    console.error('Error reviewing deliverable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review deliverable'
    });
  }
});

// ==================== DELETE DELIVERABLE ====================

/**
 * DELETE /api/deliverables/:id
 * Delete a deliverable (talent only, before review)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is the talent and deliverable is not yet reviewed
    const deliverableResult = await pool.query(`
      SELECT bd.*, tp.user_id as talent_user_id
      FROM booking_deliverables bd
      JOIN talent_profiles tp ON bd.talent_id = tp.id
      WHERE bd.id = $1
    `, [id]);

    if (deliverableResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deliverable not found'
      });
    }

    const deliverable = deliverableResult.rows[0];
    
    if (deliverable.talent_user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the talent can delete their deliverables'
      });
    }

    if (deliverable.status !== 'pending_review') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete deliverables that have been reviewed'
      });
    }

    await pool.query('DELETE FROM booking_deliverables WHERE id = $1', [id]);

    // Update booking delivered count
    await pool.query(`
      UPDATE talent_bookings
      SET 
        delivered_assets_count = COALESCE(delivered_assets_count, 1) - 1,
        updated_at = NOW()
      WHERE id = $1
    `, [deliverable.booking_id]);

    res.json({
      success: true,
      message: 'Deliverable deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting deliverable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete deliverable'
    });
  }
});

module.exports = router;
