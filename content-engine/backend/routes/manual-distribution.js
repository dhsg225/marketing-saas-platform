const express = require('express');
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Apply migration endpoint (for development)
router.post('/migrate', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to run migrations
    if (req.user.email !== 'shannon.green.asia@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized to run migrations' });
    }

    console.log('🚀 Starting Manual Distribution Management migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../database/add_manual_distribution_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await query(sql);
    
    console.log('✅ Manual Distribution Management migration completed successfully!');
    
    res.json({ 
      success: true, 
      message: 'Manual Distribution Management migration completed successfully!',
      tables_created: [
        'manual_distribution_lists',
        'distribution_target_groups', 
        'distribution_rotation_schedules',
        'distribution_rotation_rules',
        'distribution_log'
      ]
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all distribution lists for a project
router.get('/lists/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const lists = await query(
      `SELECT 
         mdl.*,
         u.name as created_by_name,
         COUNT(dtg.id) as target_group_count,
         COUNT(drs.id) as rotation_schedule_count
       FROM manual_distribution_lists mdl
       LEFT JOIN users u ON mdl.created_by = u.id
       LEFT JOIN distribution_target_groups dtg ON mdl.id = dtg.distribution_list_id AND dtg.is_active = true
       LEFT JOIN distribution_rotation_schedules drs ON mdl.id = drs.distribution_list_id AND drs.is_active = true
       WHERE mdl.project_id = $1
       GROUP BY mdl.id, u.name
       ORDER BY mdl.created_at DESC`,
      [projectId]
    );

    res.json({ lists: lists.rows });

  } catch (error) {
    console.error('Error fetching distribution lists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new distribution list
router.post('/lists', authenticateToken, async (req, res) => {
  try {
    const { project_id, name, description, target_platform } = req.body;
    const userId = req.user.userId;

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [project_id, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const result = await query(
      `INSERT INTO manual_distribution_lists (project_id, name, description, target_platform, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project_id, name, description, target_platform, userId]
    );

    res.status(201).json({ list: result.rows[0] });

  } catch (error) {
    console.error('Error creating distribution list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a distribution list
router.put('/lists/:listId', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const { name, description, target_platform, is_active } = req.body;
    const userId = req.user.userId;

    // Verify user has access to this distribution list
    const listCheck = await query(
      `SELECT mdl.id FROM manual_distribution_lists mdl
       JOIN projects p ON mdl.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE mdl.id = $1 AND uo.user_id = $2`,
      [listId, userId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution list not found or access denied' });
    }

    const result = await query(
      `UPDATE manual_distribution_lists 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           target_platform = COALESCE($3, target_platform),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, description, target_platform, is_active, listId]
    );

    res.json({ list: result.rows[0] });

  } catch (error) {
    console.error('Error updating distribution list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a distribution list
router.delete('/lists/:listId', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this distribution list
    const listCheck = await query(
      `SELECT mdl.id FROM manual_distribution_lists mdl
       JOIN projects p ON mdl.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE mdl.id = $1 AND uo.user_id = $2 AND mdl.created_by = $3`,
      [listId, userId, userId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution list not found or access denied' });
    }

    await query('DELETE FROM manual_distribution_lists WHERE id = $1', [listId]);

    res.json({ success: true, message: 'Distribution list deleted successfully' });

  } catch (error) {
    console.error('Error deleting distribution list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get target groups for a distribution list
router.get('/lists/:listId/groups', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this distribution list
    const listCheck = await query(
      `SELECT mdl.id FROM manual_distribution_lists mdl
       JOIN projects p ON mdl.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE mdl.id = $1 AND uo.user_id = $2`,
      [listId, userId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution list not found or access denied' });
    }

    const groups = await query(
      `SELECT * FROM distribution_target_groups 
       WHERE distribution_list_id = $1 
       ORDER BY group_name`,
      [listId]
    );

    res.json({ groups: groups.rows });

  } catch (error) {
    console.error('Error fetching target groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new target group
router.post('/lists/:listId/groups', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const { 
      group_name, 
      group_url, 
      group_description, 
      group_instructions,
      group_size,
      target_audience,
      posting_frequency,
      preferred_posting_days,
      preferred_posting_times,
      max_posts_per_day
    } = req.body;
    const userId = req.user.userId;

    // Verify user has access to this distribution list
    const listCheck = await query(
      `SELECT mdl.id FROM manual_distribution_lists mdl
       JOIN projects p ON mdl.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE mdl.id = $1 AND uo.user_id = $2`,
      [listId, userId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution list not found or access denied' });
    }

    const result = await query(
      `INSERT INTO distribution_target_groups (
         distribution_list_id, group_name, group_url, group_description, 
         group_instructions, group_size, target_audience, posting_frequency,
         preferred_posting_days, preferred_posting_times, max_posts_per_day
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        listId, group_name, group_url, group_description, 
        group_instructions, group_size || 0, target_audience, posting_frequency,
        preferred_posting_days, preferred_posting_times, max_posts_per_day
      ]
    );

    res.status(201).json({ group: result.rows[0] });

  } catch (error) {
    console.error('Error creating target group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a target group
router.put('/groups/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      group_name, 
      group_url, 
      group_description, 
      group_instructions,
      group_size,
      target_audience,
      posting_frequency,
      preferred_posting_days,
      preferred_posting_times,
      max_posts_per_day,
      is_active
    } = req.body;
    const userId = req.user.userId;

    // Verify user has access to this target group
    const groupCheck = await query(
      `SELECT dtg.id FROM distribution_target_groups dtg
       JOIN manual_distribution_lists mdl ON dtg.distribution_list_id = mdl.id
       JOIN projects p ON mdl.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE dtg.id = $1 AND uo.user_id = $2`,
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target group not found or access denied' });
    }

    const result = await query(
      `UPDATE distribution_target_groups 
       SET 
         group_name = COALESCE($1, group_name),
         group_url = COALESCE($2, group_url),
         group_description = COALESCE($3, group_description),
         group_instructions = COALESCE($4, group_instructions),
         group_size = COALESCE($5, group_size),
         target_audience = COALESCE($6, target_audience),
         posting_frequency = COALESCE($7, posting_frequency),
         preferred_posting_days = COALESCE($8, preferred_posting_days),
         preferred_posting_times = COALESCE($9, preferred_posting_times),
         max_posts_per_day = COALESCE($10, max_posts_per_day),
         is_active = COALESCE($11, is_active),
         updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        group_name, group_url, group_description, group_instructions,
        group_size, target_audience, posting_frequency,
        preferred_posting_days, preferred_posting_times, max_posts_per_day,
        is_active, groupId
      ]
    );

    res.json({ group: result.rows[0] });

  } catch (error) {
    console.error('Error updating target group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a target group
router.delete('/groups/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this target group
    const groupCheck = await query(
      `SELECT dtg.id FROM distribution_target_groups dtg
       JOIN manual_distribution_lists mdl ON dtg.distribution_list_id = mdl.id
       JOIN projects p ON mdl.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE dtg.id = $1 AND uo.user_id = $2`,
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target group not found or access denied' });
    }

    await query('DELETE FROM distribution_target_groups WHERE id = $1', [groupId]);

    res.json({ success: true, message: 'Target group deleted successfully' });

  } catch (error) {
    console.error('Error deleting target group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get distribution log for a project
router.get('/logs/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const logs = await query(
      `SELECT 
         dl.*,
         mdl.name as distribution_list_name,
         dtg.group_name as target_group_name,
         u.name as shared_by_name
       FROM distribution_log dl
       LEFT JOIN manual_distribution_lists mdl ON dl.distribution_list_id = mdl.id
       LEFT JOIN distribution_target_groups dtg ON dl.target_group_id = dtg.id
       LEFT JOIN users u ON dl.shared_by = u.id
       WHERE dl.project_id = $1
       ORDER BY dl.shared_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );

    const totalCount = await query(
      `SELECT COUNT(*) as total FROM distribution_log WHERE project_id = $1`,
      [projectId]
    );

    res.json({ 
      logs: logs.rows, 
      total: parseInt(totalCount.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching distribution logs:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
