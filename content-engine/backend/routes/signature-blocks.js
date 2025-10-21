const express = require('express');
const { pool } = require('../../database/config');
const router = express.Router();

// Get all signature blocks for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM signature_blocks WHERE project_id = $1 AND is_active = true ORDER BY is_default DESC, name ASC',
      [projectId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching signature blocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new signature block
router.post('/', async (req, res) => {
  try {
    const { project_id, name, type, content, is_default } = req.body;
    
    // If setting as default, unset other defaults for this project
    if (is_default) {
      await pool.query(
        'UPDATE signature_blocks SET is_default = false WHERE project_id = $1',
        [project_id]
      );
    }
    
    const result = await pool.query(
      `INSERT INTO signature_blocks (project_id, name, type, content, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project_id, name, type, content, is_default || false]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating signature block:', error);
    
    // Handle unique constraint violation for default blocks
    if (error.code === '23505' && error.constraint === 'idx_signature_blocks_unique_default') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only one signature block can be set as default per project' 
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a signature block
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, content, is_default } = req.body;
    
    // Get the project_id first
    const projectResult = await pool.query(
      'SELECT project_id FROM signature_blocks WHERE id = $1',
      [id]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Signature block not found' });
    }
    
    const project_id = projectResult.rows[0].project_id;
    
    // If setting as default, unset other defaults for this project
    if (is_default) {
      await pool.query(
        'UPDATE signature_blocks SET is_default = false WHERE project_id = $1 AND id != $2',
        [project_id, id]
      );
    }
    
    const result = await pool.query(
      `UPDATE signature_blocks 
       SET name = $1, type = $2, content = $3, is_default = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, type, content, is_default || false, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Signature block not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating signature block:', error);
    
    // Handle unique constraint violation for default blocks
    if (error.code === '23505' && error.constraint === 'idx_signature_blocks_unique_default') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only one signature block can be set as default per project' 
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a signature block (soft delete by setting is_active to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE signature_blocks SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Signature block not found' });
    }
    
    res.json({ success: true, message: 'Signature block deleted successfully' });
  } catch (error) {
    console.error('Error deleting signature block:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get signature block by ID
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM signature_blocks WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Signature block not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching signature block:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
