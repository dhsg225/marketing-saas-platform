const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/projects/:id
 * Get project details by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id, p.name, p.description, p.status, p.created_at
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [id, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    const project = projectCheck.rows[0];
    
    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        created_at: project.created_at
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

module.exports = router;
