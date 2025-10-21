const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');

// List assets by scope with pagination
router.get('/', async (req, res) => {
  try {
    const { scope, organization_id, project_id, owner_user_id, limit = 12, page = 1 } = req.query;
    
    // Build WHERE clause
    let where = [];
    const params = [];
    if (scope) { params.push(scope); where.push(`scope = $${params.length}`); }
    if (organization_id) { params.push(organization_id); where.push(`organization_id = $${params.length}`); }
    if (project_id) { params.push(project_id); where.push(`project_id = $${params.length}`); }
    if (owner_user_id) { params.push(owner_user_id); where.push(`owner_user_id = $${params.length}`); }
    
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    
    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM assets ${whereClause}`;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated results
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);
    const sql = `SELECT * FROM assets ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const result = await query(sql, params);
    
    res.json({ 
      success: true, 
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (e) {
    console.error('Assets list error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create asset record (metadata only; upload via signed URL TBD)
// [2025-10-08] - Updated to support variants for processed images
router.post('/', async (req, res) => {
  try {
    const { scope, organization_id, project_id, owner_user_id, file_name, mime_type, width, height, storage_path, url, tags = [], metadata = {}, variants = {}, created_by } = req.body;
    const result = await query(
      `INSERT INTO assets (scope, organization_id, project_id, owner_user_id, file_name, mime_type, width, height, storage_path, url, tags, metadata, variants, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [scope, organization_id || null, project_id || null, owner_user_id || null, file_name, mime_type || null, width || null, height || null, storage_path, url || storage_path, JSON.stringify(tags), JSON.stringify(metadata), JSON.stringify(variants), created_by || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Asset create error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Delete asset by ID
// [2025-10-09] - Added DELETE endpoint for asset deletion
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if asset exists
    const checkResult = await query('SELECT * FROM assets WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    
    // Delete the asset
    const result = await query('DELETE FROM assets WHERE id = $1 RETURNING *', [id]);
    
    res.json({ 
      success: true, 
      message: 'Asset deleted successfully',
      data: result.rows[0]
    });
  } catch (e) {
    console.error('Asset delete error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;


