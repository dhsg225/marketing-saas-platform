// [2025-10-09] - Content Ideas/Topics API Routes (FIXED)
// This handles CRUD operations for content ideas linked to Post Types

const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../../middleware/auth');

// Get all content ideas for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const ideasQuery = `
      SELECT 
        ci.*,
        pt.name as post_type_name,
        pt.purpose as post_type_purpose,
        pt.tone as post_type_tone,
        u.name as created_by_name,
        approver.name as approved_by_name
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN users u ON ci.created_by = u.id
      LEFT JOIN users approver ON ci.approved_by = approver.id
      WHERE ci.project_id = $1
      ORDER BY ci.suggested_date ASC, ci.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM content_ideas ci
      WHERE ci.project_id = $1
    `;
    
    const [ideasResult, countResult] = await Promise.all([
      query(ideasQuery, [projectId, limit, offset]),
      query(countQuery, [projectId])
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: ideasResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Content ideas fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content ideas' });
  }
});

// Get content idea by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        ci.*,
        pt.name as post_type_name,
        pt.purpose as post_type_purpose,
        pt.tone as post_type_tone,
        u.name as created_by_name,
        approver.name as approved_by_name
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN users u ON ci.created_by = u.id
      LEFT JOIN users approver ON ci.approved_by = approver.id
      WHERE ci.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content idea not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching content idea:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content idea' });
  }
});

// Create new content idea
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      project_id,
      post_type_id,
      title,
      description,
      topic_keywords,
      suggested_date,
      suggested_time,
      priority,
      notes
    } = req.body;
    
    const created_by = req.user.id;
    
    const result = await query(`
      INSERT INTO content_ideas (
        project_id, post_type_id, title, description, topic_keywords,
        suggested_date, suggested_time, priority, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      project_id, post_type_id, title, description, topic_keywords,
      suggested_date, suggested_time, priority, notes, created_by
    ]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating content idea:', error);
    res.status(500).json({ success: false, error: 'Failed to create content idea' });
  }
});

// Update content idea
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      post_type_id,
      title,
      description,
      topic_keywords,
      suggested_date,
      suggested_time,
      priority,
      status,
      approved_by,
      approved_at,
      generated_content_id,
      notes
    } = req.body;
    
    const result = await query(`
      UPDATE content_ideas
      SET 
        post_type_id = COALESCE($1, post_type_id),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        topic_keywords = COALESCE($4, topic_keywords),
        suggested_date = COALESCE($5, suggested_date),
        suggested_time = COALESCE($6, suggested_time),
        priority = COALESCE($7, priority),
        status = COALESCE($8, status),
        approved_by = COALESCE($9, approved_by),
        approved_at = COALESCE($10, approved_at),
        generated_content_id = COALESCE($11, generated_content_id),
        notes = COALESCE($12, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      post_type_id, title, description, topic_keywords, suggested_date,
      suggested_time, priority, status, approved_by, approved_at,
      generated_content_id, notes, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content idea not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating content idea:', error);
    res.status(500).json({ success: false, error: 'Failed to update content idea' });
  }
});

// Delete content idea
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM content_ideas WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content idea not found' });
    }
    
    res.json({ success: true, message: 'Content idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting content idea:', error);
    res.status(500).json({ success: false, error: 'Failed to delete content idea' });
  }
});

// Approve content idea
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const approved_by = req.user.id;
    const approved_at = new Date();
    
    const result = await query(`
      UPDATE content_ideas
      SET 
        status = 'approved',
        approved_by = $1,
        approved_at = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status != 'approved'
      RETURNING *
    `, [approved_by, approved_at, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Content idea not found or already approved' 
      });
    }
    
    res.json({ 
      success: true, 
      data: result.rows[0], 
      message: 'Content idea approved successfully' 
    });
  } catch (error) {
    console.error('Error approving content idea:', error);
    res.status(500).json({ success: false, error: 'Failed to approve content idea' });
  }
});

module.exports = router;
