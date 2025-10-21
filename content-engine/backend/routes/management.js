const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../../middleware/auth');

// Update project name
router.put('/project/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project name is required' 
      });
    }

    // Check if project exists and user has access
    const projectCheck = await query(
      'SELECT p.*, c.organization_id FROM projects p JOIN clients c ON p.client_id = c.id WHERE p.id = $1',
      [id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      });
    }

    // Update project
    const result = await query(
      'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name.trim(), description?.trim() || null, id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update project' 
    });
  }
});

// Update client name
router.put('/client/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contact_email, contact_phone } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Client name is required' 
      });
    }

    // Check if client exists
    const clientCheck = await query('SELECT * FROM clients WHERE id = $1', [id]);

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Client not found' 
      });
    }

    // Update client
    const result = await query(
      'UPDATE clients SET company_name = $1, business_description = $2, primary_contact_email = $3, primary_contact_phone = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name.trim(), description?.trim() || null, contact_email?.trim() || null, contact_phone?.trim() || null, id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Client updated successfully'
    });

  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update client' 
    });
  }
});

// Update organization name
router.put('/organization/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Organization name is required' 
      });
    }

    // Check if organization exists
    const orgCheck = await query('SELECT * FROM organizations WHERE id = $1', [id]);

    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Organization not found' 
      });
    }

    // Update organization
    const result = await query(
      'UPDATE organizations SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name.trim(), description?.trim() || null, id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Organization updated successfully'
    });

  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update organization' 
    });
  }
});

// Update user profile
router.put('/user/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, industry_preference } = req.body;

    // Only allow users to update their own profile, or admin users
    if (req.user.id !== id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only update your own profile' 
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name is required' 
      });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Check if email is already taken by another user
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.trim(), id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is already taken' 
      });
    }

    // Update user
    const result = await query(
      'UPDATE users SET name = $1, email = $2, industry_preference = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, email, industry_preference, created_at',
      [name.trim(), email.trim(), industry_preference || null, id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update profile' 
    });
  }
});

// Delete project
router.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projectId = req.params.id;
    
    console.log('🗑️ Delete project - User ID:', userId, 'Project ID:', projectId);
    
    // First check if user has access to this project
    const projectCheck = await query(`
      SELECT p.id 
      FROM projects p 
      JOIN organizations o ON p.organization_id = o.id 
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE p.id = $1 AND uo.user_id = $2
    `, [projectId, userId]);
    
    console.log('🔍 Project access check result:', projectCheck.rows.length, 'rows');
    
    if (projectCheck.rows.length === 0) {
      console.log('❌ Project not found or access denied');
      return res.status(404).json({ error: 'Project not found or access denied' });
    }
    
    // Delete the project
    await query('DELETE FROM projects WHERE id = $1', [projectId]);
    
    console.log('✅ Project deleted successfully');
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Get all entities for management interface
router.get('/entities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 Management entities - User ID:', userId);
    
    // Get organizations the user has access to
    const organizations = await query(`
      SELECT o.id, o.name, o.description, o.created_at 
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = $1
      ORDER BY o.name
    `, [userId]);
    
    // Get clients from organizations the user has access to
    const clients = await query(`
      SELECT c.id, c.company_name as name, c.business_description as description, 
             c.primary_contact_email as contact_email, c.primary_contact_phone as contact_phone, 
             c.created_at, o.name as organization_name
      FROM clients c 
      JOIN organizations o ON c.organization_id = o.id 
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = $1
      ORDER BY c.company_name
    `, [userId]);
    
    // Get projects from organizations the user has access to
    const projects = await query(`
      SELECT p.id, p.name, p.description, p.status, p.created_at,
             COALESCE(c.company_name, 'No Client') as client_name, o.name as organization_name
      FROM projects p 
      JOIN organizations o ON p.organization_id = o.id 
      JOIN user_organizations uo ON o.id = uo.organization_id
      LEFT JOIN clients c ON p.client_id = c.id 
      WHERE uo.user_id = $1
      ORDER BY p.name
    `, [userId]);
    
    // Get users from organizations the user has access to
    const users = await query(`
      SELECT DISTINCT u.id, u.name, u.email, u.industry_preference, u.created_at 
      FROM users u
      JOIN user_organizations uo1 ON u.id = uo1.user_id
      JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
      WHERE uo2.user_id = $1
      ORDER BY u.name
    `, [userId]);

    res.json({
      success: true,
      data: {
        organizations: organizations.rows,
        clients: clients.rows,
        projects: projects.rows,
        users: users.rows
      }
    });

  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch entities' 
    });
  }
});

module.exports = router;
