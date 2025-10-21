// [October 15, 2025] - Talent Availability Routes (Option D - Calendar)
// Purpose: Manage talent availability calendar

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');

async function verifyTalentOwnership(userId, talentId) {
  const result = await pool.query(
    'SELECT id FROM talent_profiles WHERE id = $1 AND user_id = $2',
    [talentId, userId]
  );
  return result.rows.length > 0;
}

// ==================== GET AVAILABILITY ====================

/**
 * GET /api/talent/availability/:talentId
 * Get availability calendar for a talent
 */
router.get('/availability/:talentId', async (req, res) => {
  try {
    const { talentId } = req.params;
    const { start_date, end_date, status } = req.query;

    let query = 'SELECT * FROM talent_availability WHERE talent_id = $1';
    const params = [talentId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND available_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND available_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY available_date ASC, start_time ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability'
    });
  }
});

// ==================== ADD AVAILABILITY ====================

/**
 * POST /api/talent/availability
 * Add availability slot(s)
 */
router.post('/availability', authenticateToken, async (req, res) => {
  try {
    const {
      talent_id,
      available_date,
      start_time,
      end_time,
      is_all_day = true,
      notes
    } = req.body;

    const userId = req.user.userId;

    // Verify ownership
    const isOwner = await verifyTalentOwnership(userId, talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await pool.query(`
      INSERT INTO talent_availability (
        talent_id, available_date, start_time, end_time, is_all_day, status, notes
      ) VALUES ($1, $2, $3, $4, $5, 'available', $6)
      RETURNING *
    `, [talent_id, available_date, start_time, end_time, is_all_day, notes]);

    console.log('✅ Availability added:', result.rows[0].id);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        error: 'Availability slot already exists for this date/time'
      });
    }
    
    console.error('Add availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add availability'
    });
  }
});

// ==================== UPDATE AVAILABILITY ====================

/**
 * PUT /api/talent/availability/:id
 * Update availability slot
 */
router.put('/availability/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, start_time, end_time } = req.body;
    const userId = req.user.userId;

    // Verify ownership
    const slot = await pool.query(
      'SELECT talent_id FROM talent_availability WHERE id = $1',
      [id]
    );

    if (slot.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Availability slot not found'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, slot.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await pool.query(`
      UPDATE talent_availability SET
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, notes, start_time, end_time, id]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update availability'
    });
  }
});

// ==================== DELETE AVAILABILITY ====================

/**
 * DELETE /api/talent/availability/:id
 * Delete availability slot
 */
router.delete('/availability/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const slot = await pool.query(
      'SELECT talent_id, status FROM talent_availability WHERE id = $1',
      [id]
    );

    if (slot.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Availability slot not found'
      });
    }

    if (slot.rows[0].status === 'booked') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete booked slots'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, slot.rows[0].talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await pool.query('DELETE FROM talent_availability WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Availability slot deleted'
    });

  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete availability'
    });
  }
});

// ==================== BULK OPERATIONS ====================

/**
 * POST /api/talent/availability/bulk
 * Add multiple availability slots at once
 */
router.post('/availability/bulk', authenticateToken, async (req, res) => {
  try {
    const { talent_id, dates, is_all_day = true } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'dates array is required'
      });
    }

    const isOwner = await verifyTalentOwnership(userId, talent_id);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const client = await pool.connect();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const date of dates) {
        const result = await client.query(`
          INSERT INTO talent_availability (
            talent_id, available_date, is_all_day, status
          ) VALUES ($1, $2, $3, 'available')
          ON CONFLICT (talent_id, available_date, start_time) DO NOTHING
          RETURNING *
        `, [talent_id, date, is_all_day]);

        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');

      console.log(`✅ Added ${results.length} availability slots`);

      res.status(201).json({
        success: true,
        data: results,
        count: results.length
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Bulk add availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add availability slots'
    });
  }
});

module.exports = router;

