// [October 16, 2025] - Reviews Management Routes
// Purpose: Handle reviews, ratings, and talent responses
// Features: Review submission, rating calculations, talent responses, helpful votes

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');

// ==================== CREATE REVIEW ====================

/**
 * POST /api/reviews
 * Create a review for a completed booking
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      bookingId,
      overallRating,
      qualityRating,
      professionalismRating,
      communicationRating,
      valueRating,
      reviewTitle,
      reviewText
    } = req.body;

    if (!bookingId || !overallRating || !reviewText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, overallRating, reviewText'
      });
    }

    // Verify user is the client and booking is completed
    const bookingResult = await pool.query(`
      SELECT tb.*, tp.id as talent_profile_id
      FROM talent_bookings tb
      JOIN talent_profiles tp ON tb.talent_id = tp.id
      WHERE tb.id = $1 AND tb.booked_by_user_id = $2
    `, [bookingId, req.user.userId]);

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied or booking not found'
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Can only review completed bookings'
      });
    }

    // Check if review already exists
    const existingReview = await pool.query(`
      SELECT id FROM talent_reviews WHERE booking_id = $1
    `, [bookingId]);

    if (existingReview.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Review already exists for this booking'
      });
    }

    // Create review
    const result = await pool.query(`
      INSERT INTO talent_reviews (
        booking_id, talent_id, reviewer_user_id, reviewer_name,
        overall_rating, quality_rating, professionalism_rating,
        communication_rating, value_rating, review_title, review_text,
        is_public, is_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, true, NOW())
      RETURNING *
    `, [
      bookingId,
      booking.talent_profile_id,
      req.user.userId,
      req.user.name,
      overallRating,
      qualityRating || overallRating,
      professionalismRating || overallRating,
      communicationRating || overallRating,
      valueRating || overallRating,
      reviewTitle || null,
      reviewText
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Review created successfully'
    });

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review'
    });
  }
});

// ==================== GET REVIEWS FOR TALENT ====================

/**
 * GET /api/reviews/talent/:talentId
 * Get all reviews for a talent profile
 */
router.get('/talent/:talentId', async (req, res) => {
  try {
    const { talentId } = req.params;
    const { page = 1, limit = 10, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        tr.*,
        tb.booking_number,
        tb.title as booking_title,
        rr.response_text as talent_response,
        rr.created_at as response_date,
        (SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = tr.id AND is_helpful = true) as helpful_count,
        (SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = tr.id AND is_helpful = false) as not_helpful_count
      FROM talent_reviews tr
      LEFT JOIN talent_bookings tb ON tr.booking_id = tb.id
      LEFT JOIN review_responses rr ON tr.id = rr.review_id
      WHERE tr.talent_id = $1 AND tr.is_public = true
      ORDER BY ${sort_by} ${sort_order}
      LIMIT $2 OFFSET $3
    `, [talentId, limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM talent_reviews
      WHERE talent_id = $1 AND is_public = true
    `, [talentId]);

    // Get rating breakdown
    const ratingBreakdown = await pool.query(`
      SELECT 
        AVG(overall_rating)::DECIMAL(3,2) as average_overall,
        AVG(quality_rating)::DECIMAL(3,2) as average_quality,
        AVG(professionalism_rating)::DECIMAL(3,2) as average_professionalism,
        AVG(communication_rating)::DECIMAL(3,2) as average_communication,
        AVG(value_rating)::DECIMAL(3,2) as average_value,
        COUNT(CASE WHEN overall_rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN overall_rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN overall_rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN overall_rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN overall_rating = 1 THEN 1 END) as one_star
      FROM talent_reviews
      WHERE talent_id = $1 AND is_public = true
    `, [talentId]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      },
      ratingBreakdown: ratingBreakdown.rows[0]
    });

  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reviews'
    });
  }
});

// ==================== ADD TALENT RESPONSE ====================

/**
 * POST /api/reviews/:reviewId/respond
 * Add a talent response to a review
 */
router.post('/:reviewId/respond', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { responseText } = req.body;

    if (!responseText) {
      return res.status(400).json({
        success: false,
        error: 'Response text is required'
      });
    }

    // Verify user is the talent for this review
    const reviewResult = await pool.query(`
      SELECT tr.*, tp.user_id as talent_user_id
      FROM talent_reviews tr
      JOIN talent_profiles tp ON tr.talent_id = tp.id
      WHERE tr.id = $1
    `, [reviewId]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    const review = reviewResult.rows[0];
    if (review.talent_user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the talent can respond to their reviews'
      });
    }

    // Check if response already exists
    const existingResponse = await pool.query(`
      SELECT id FROM review_responses WHERE review_id = $1
    `, [reviewId]);

    if (existingResponse.rows.length > 0) {
      // Update existing response
      const result = await pool.query(`
        UPDATE review_responses
        SET 
          response_text = $1,
          updated_at = NOW()
        WHERE review_id = $2
        RETURNING *
      `, [responseText, reviewId]);

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'Response updated successfully'
      });
    }

    // Create new response
    const result = await pool.query(`
      INSERT INTO review_responses (
        review_id, talent_id, response_text, is_public, created_at
      ) VALUES ($1, $2, $3, true, NOW())
      RETURNING *
    `, [reviewId, review.talent_id, responseText]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Response added successfully'
    });

  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
});

// ==================== VOTE ON REVIEW HELPFULNESS ====================

/**
 * POST /api/reviews/:reviewId/helpful
 * Vote on whether a review is helpful
 */
router.post('/:reviewId/helpful', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isHelpful } = req.body;

    if (typeof isHelpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isHelpful must be a boolean'
      });
    }

    // Check if user already voted
    const existingVote = await pool.query(`
      SELECT id FROM review_helpful_votes 
      WHERE review_id = $1 AND user_id = $2
    `, [reviewId, req.user.userId]);

    if (existingVote.rows.length > 0) {
      // Update existing vote
      await pool.query(`
        UPDATE review_helpful_votes
        SET is_helpful = $1
        WHERE review_id = $2 AND user_id = $3
      `, [isHelpful, reviewId, req.user.userId]);

      return res.json({
        success: true,
        message: 'Vote updated'
      });
    }

    // Create new vote
    await pool.query(`
      INSERT INTO review_helpful_votes (review_id, user_id, is_helpful, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [reviewId, req.user.userId, isHelpful]);

    res.status(201).json({
      success: true,
      message: 'Vote recorded'
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    });
  }
});

// ==================== GET REVIEW BY BOOKING ====================

/**
 * GET /api/reviews/booking/:bookingId
 * Get review for a specific booking
 */
router.get('/booking/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await pool.query(`
      SELECT 
        tr.*,
        rr.response_text as talent_response,
        rr.created_at as response_date
      FROM talent_reviews tr
      LEFT JOIN review_responses rr ON tr.id = rr.review_id
      WHERE tr.booking_id = $1
    `, [bookingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No review found for this booking'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error getting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get review'
    });
  }
});

module.exports = router;
