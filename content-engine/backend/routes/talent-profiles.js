// [October 15, 2025] - Talent Profile Management Routes
// Purpose: Complete CRUD operations for talent marketplace profiles
// Multi-tenant: Users can only manage their own profiles or profiles in their organization

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');
const stripeService = require('../services/stripeService');

// ==================== HELPER FUNCTIONS ====================

/**
 * Verify user has access to talent profile
 */
async function verifyProfileAccess(userId, profileId) {
  const result = await pool.query(`
    SELECT tp.*
    FROM talent_profiles tp
    WHERE tp.id = $1 
      AND (tp.user_id = $2 OR tp.id IN (
        SELECT tp2.id FROM talent_profiles tp2
        JOIN users u ON tp2.user_id = u.id
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.organization_id IN (
          SELECT organization_id FROM user_organizations WHERE user_id = $2
        )
      ))
  `, [profileId, userId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

// ==================== CREATE TALENT PROFILE ====================

/**
 * POST /api/talent/profiles
 * Create a new talent profile
 */
router.post('/profiles', authenticateToken, async (req, res) => {
  try {
    const {
      business_name,
      display_name,
      email,
      phone,
      talent_type,
      bio,
      tagline,
      years_experience,
      city,
      state,
      country = 'USA',
      service_radius_miles = 25,
      willing_to_travel = false,
      hourly_rate,
      minimum_booking_hours = 2,
      base_rate,
      profile_image_url,
      cover_image_url,
      website_url,
      instagram_handle,
      facebook_url,
      linkedin_url
    } = req.body;

    const userId = req.user.userId;

    // Validation
    if (!business_name || !display_name || !email || !talent_type) {
      return res.status(400).json({
        success: false,
        error: 'business_name, display_name, email, and talent_type are required'
      });
    }

    // Check if user already has a talent profile
    const existingProfile = await pool.query(
      'SELECT id FROM talent_profiles WHERE user_id = $1',
      [userId]
    );

    if (existingProfile.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User already has a talent profile. Use PUT to update.',
        existingProfileId: existingProfile.rows[0].id
      });
    }

    // Create Stripe connected account (scaffolded for now)
    const stripeResult = await stripeService.createConnectedAccount({
      email,
      business_name,
      country
    });

    // Insert profile
    const result = await pool.query(`
      INSERT INTO talent_profiles (
        user_id,
        business_name,
        display_name,
        email,
        phone,
        talent_type,
        bio,
        tagline,
        years_experience,
        city,
        state,
        country,
        service_radius_miles,
        willing_to_travel,
        hourly_rate,
        minimum_booking_hours,
        base_rate,
        profile_image_url,
        cover_image_url,
        website_url,
        instagram_handle,
        facebook_url,
        linkedin_url,
        stripe_account_id,
        profile_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, 'pending'
      ) RETURNING *
    `, [
      userId, business_name, display_name, email, phone, talent_type,
      bio, tagline, years_experience, city, state, country,
      service_radius_miles, willing_to_travel, hourly_rate, minimum_booking_hours,
      base_rate, profile_image_url, cover_image_url, website_url,
      instagram_handle, facebook_url, linkedin_url, stripeResult.accountId
    ]);

    console.log('✅ Talent profile created:', result.rows[0].id);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Talent profile created successfully. Status: pending approval.'
    });

  } catch (error) {
    console.error('Create talent profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create talent profile',
      details: error.message
    });
  }
});

// ==================== GET TALENT PROFILES ====================

/**
 * GET /api/talent/profiles
 * List/search talent profiles with filters
 */
router.get('/profiles', async (req, res) => {
  try {
    const {
      search,
      talent_type,
      city,
      state,
      min_rating,
      max_hourly_rate,
      is_verified,
      status = 'active',
      page = 1,
      limit = 20,
      sort_by = 'average_rating',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        tp.*,
        COUNT(tr.id) as review_count,
        (SELECT COUNT(*) FROM talent_portfolios WHERE talent_id = tp.id AND is_public = true) as portfolio_count,
        (SELECT COUNT(*) FROM talent_services WHERE talent_id = tp.id AND is_active = true) as services_count
      FROM talent_profiles tp
      LEFT JOIN talent_reviews tr ON tp.id = tr.talent_id AND tr.is_public = true
      WHERE tp.profile_status = $1
    `;

    const params = [status];
    let paramIndex = 2;

    // Add filters
    if (search) {
      query += ` AND (
        tp.business_name ILIKE $${paramIndex} OR 
        tp.display_name ILIKE $${paramIndex} OR 
        tp.bio ILIKE $${paramIndex} OR
        tp.tagline ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (talent_type) {
      query += ` AND tp.talent_type = $${paramIndex}`;
      params.push(talent_type);
      paramIndex++;
    }

    if (city) {
      query += ` AND tp.city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (state) {
      query += ` AND tp.state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }

    if (min_rating) {
      query += ` AND tp.average_rating >= $${paramIndex}`;
      params.push(parseFloat(min_rating));
      paramIndex++;
    }

    if (max_hourly_rate) {
      query += ` AND tp.hourly_rate <= $${paramIndex}`;
      params.push(parseFloat(max_hourly_rate));
      paramIndex++;
    }

    if (is_verified === 'true') {
      query += ` AND tp.is_verified = true`;
    }

    query += ` GROUP BY tp.id`;

    // Sorting
    const validSortFields = ['average_rating', 'total_bookings', 'hourly_rate', 'created_at', 'display_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'average_rating';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY tp.${sortField} ${sortDirection}`;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM talent_profiles tp WHERE tp.profile_status = $1';
    const countParams = [status];
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('List talent profiles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch talent profiles'
    });
  }
});

/**
 * GET /api/talent/profiles/:id
 * Get single talent profile with full details
 */
router.get('/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        tp.*,
        COUNT(DISTINCT tr.id) as review_count,
        COUNT(DISTINCT tpo.id) as portfolio_count,
        COUNT(DISTINCT ts.id) as services_count,
        json_agg(DISTINCT jsonb_build_object(
          'id', ts.id,
          'service_name', ts.service_name,
          'description', ts.description,
          'pricing_model', ts.pricing_model,
          'base_price', ts.base_price
        )) FILTER (WHERE ts.id IS NOT NULL) as services,
        json_agg(DISTINCT jsonb_build_object(
          'id', tpo.id,
          'title', tpo.title,
          'description', tpo.description,
          'media_type', tpo.media_type,
          'media_url', tpo.media_url,
          'thumbnail_url', tpo.thumbnail_url,
          'is_featured', tpo.is_featured,
          'display_order', tpo.display_order
        )) FILTER (WHERE tpo.id IS NOT NULL AND tpo.is_public = true) as portfolio
      FROM talent_profiles tp
      LEFT JOIN talent_reviews tr ON tp.id = tr.talent_id AND tr.is_public = true
      LEFT JOIN talent_portfolios tpo ON tp.id = tpo.talent_id
      LEFT JOIN talent_services ts ON tp.id = ts.talent_id AND ts.is_active = true
      WHERE tp.id = $1
      GROUP BY tp.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Talent profile not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get talent profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch talent profile'
    });
  }
});

/**
 * GET /api/talent/profiles/my/profile
 * Get current user's talent profile
 */
router.get('/profiles/my/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT tp.* FROM talent_profiles tp WHERE tp.user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No talent profile found for this user',
        message: 'Create a profile to get started'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// ==================== UPDATE TALENT PROFILE ====================

/**
 * PUT /api/talent/profiles/:id
 * Update talent profile
 */
router.put('/profiles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify access
    const profile = await verifyProfileAccess(userId, id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you do not own this profile'
      });
    }

    const {
      business_name,
      display_name,
      email,
      phone,
      talent_type,
      bio,
      tagline,
      years_experience,
      city,
      state,
      country,
      service_radius_miles,
      willing_to_travel,
      hourly_rate,
      minimum_booking_hours,
      base_rate,
      profile_image_url,
      cover_image_url,
      website_url,
      instagram_handle,
      facebook_url,
      linkedin_url,
      is_accepting_bookings
    } = req.body;

    const result = await pool.query(`
      UPDATE talent_profiles SET
        business_name = COALESCE($1, business_name),
        display_name = COALESCE($2, display_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        talent_type = COALESCE($5, talent_type),
        bio = COALESCE($6, bio),
        tagline = COALESCE($7, tagline),
        years_experience = COALESCE($8, years_experience),
        city = COALESCE($9, city),
        state = COALESCE($10, state),
        country = COALESCE($11, country),
        service_radius_miles = COALESCE($12, service_radius_miles),
        willing_to_travel = COALESCE($13, willing_to_travel),
        hourly_rate = COALESCE($14, hourly_rate),
        minimum_booking_hours = COALESCE($15, minimum_booking_hours),
        base_rate = COALESCE($16, base_rate),
        profile_image_url = COALESCE($17, profile_image_url),
        cover_image_url = COALESCE($18, cover_image_url),
        website_url = COALESCE($19, website_url),
        instagram_handle = COALESCE($20, instagram_handle),
        facebook_url = COALESCE($21, facebook_url),
        linkedin_url = COALESCE($22, linkedin_url),
        is_accepting_bookings = COALESCE($23, is_accepting_bookings),
        last_active_at = NOW(),
        updated_at = NOW()
      WHERE id = $24
      RETURNING *
    `, [
      business_name, display_name, email, phone, talent_type, bio, tagline,
      years_experience, city, state, country, service_radius_miles,
      willing_to_travel, hourly_rate, minimum_booking_hours, base_rate,
      profile_image_url, cover_image_url, website_url, instagram_handle,
      facebook_url, linkedin_url, is_accepting_bookings, id
    ]);

    console.log('✅ Talent profile updated:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update talent profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update talent profile'
    });
  }
});

// ==================== DELETE TALENT PROFILE ====================

/**
 * DELETE /api/talent/profiles/:id
 * Delete/deactivate talent profile
 */
router.delete('/profiles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify access
    const profile = await verifyProfileAccess(userId, id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you do not own this profile'
      });
    }

    // Check for active bookings
    const activeBookings = await pool.query(`
      SELECT COUNT(*) as count FROM talent_bookings
      WHERE talent_id = $1 
        AND status IN ('pending', 'accepted', 'paid', 'in_progress')
    `, [id]);

    if (parseInt(activeBookings.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete profile with active bookings',
        activeBookingsCount: parseInt(activeBookings.rows[0].count)
      });
    }

    // Soft delete - set status to inactive
    await pool.query(`
      UPDATE talent_profiles 
      SET profile_status = 'inactive', is_accepting_bookings = false, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    console.log('✅ Talent profile deactivated:', id);

    res.json({
      success: true,
      message: 'Profile deactivated successfully'
    });

  } catch (error) {
    console.error('Delete talent profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete talent profile'
    });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * PUT /api/talent/profiles/:id/approve
 * Admin: Approve talent profile
 */
router.put('/profiles/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // TODO: Add admin role check here
    // For now, any authenticated user can approve (change in production)

    const result = await pool.query(`
      UPDATE talent_profiles 
      SET 
        profile_status = 'active',
        is_verified = true,
        verification_date = NOW(),
        verified_by = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Talent profile not found'
      });
    }

    console.log('✅ Talent profile approved:', id);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile approved and activated'
    });

  } catch (error) {
    console.error('Approve talent profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve talent profile'
    });
  }
});

/**
 * PUT /api/talent/profiles/:id/suspend
 * Admin: Suspend talent profile
 */
router.put('/profiles/:id/suspend', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // TODO: Add admin role check

    const result = await pool.query(`
      UPDATE talent_profiles 
      SET 
        profile_status = 'suspended',
        is_accepting_bookings = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Talent profile not found'
      });
    }

    console.log('⚠️ Talent profile suspended:', id, '- Reason:', reason);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile suspended'
    });

  } catch (error) {
    console.error('Suspend talent profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend talent profile'
    });
  }
});

module.exports = router;

