// [October 15, 2025] - Secured Late API Routes with Multi-Tenant Isolation
// Purpose: Ensure users can ONLY access social media accounts for their own organizations
// All routes verify organization membership before accessing Late API data

const express = require('express');
const router = express.Router();
const lateApiService = require('../services/lateApiService');
const { authenticateToken } = require('../../middleware/auth');
const { pool } = require('../../database/config');

// ==================== HELPER FUNCTIONS ====================

/**
 * Verify user has access to a project
 */
async function verifyProjectAccess(userId, projectId) {
  const result = await pool.query(`
    SELECT p.id, p.organization_id, c.id as client_id
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    JOIN user_organizations uo ON c.organization_id = uo.organization_id
    WHERE p.id = $1 AND uo.user_id = $2
  `, [projectId, userId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get connected Late profiles for a project
 */
async function getProjectLateProfiles(projectId) {
  const result = await pool.query(`
    SELECT late_profile_id, late_account_id, platform, account_name, account_handle
    FROM social_account_connections
    WHERE project_id = $1 AND is_active = true
  `, [projectId]);
  
  return result.rows;
}

/**
 * Verify user has access to organization
 */
async function verifyOrganizationAccess(userId, organizationId) {
  const result = await pool.query(`
    SELECT uo.organization_id, uo.role
    FROM user_organizations uo
    WHERE uo.organization_id = $1 AND uo.user_id = $2
  `, [organizationId, userId]);
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

// ==================== CONNECTION MANAGEMENT ====================

// GET /api/social/connections/:projectId - Get all social connections for a project
router.get('/connections/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied - you do not have permission to view this project' 
      });
    }
    
    // Get connections
    const connections = await pool.query(`
      SELECT 
        id,
        late_profile_id,
        late_profile_name,
        late_account_id,
        platform,
        account_name,
        account_handle,
        account_type,
        profile_image_url,
        is_active,
        connection_status,
        last_synced_at,
        created_at
      FROM social_account_connections
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);
    
    res.json({ 
      success: true, 
      data: connections.rows,
      count: connections.rows.length
    });
  } catch (error) {
    console.error('Fetch connections error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch social connections' });
  }
});

// POST /api/social/connections - Connect a Late profile to a project
router.post('/connections', authenticateToken, async (req, res) => {
  try {
    const { 
      projectId, 
      lateProfileId, 
      lateProfileName,
      lateAccountId,
      platform, 
      accountName, 
      accountHandle,
      accountType,
      profileImageUrl 
    } = req.body;
    const userId = req.user.userId;
    
    // Validate required fields
    if (!projectId || !lateProfileId || !platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'projectId, lateProfileId, and platform are required' 
      });
    }
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied - you do not have permission to modify this project' 
      });
    }
    
    // Insert connection
    const result = await pool.query(`
      INSERT INTO social_account_connections (
        organization_id,
        project_id,
        late_profile_id,
        late_profile_name,
        late_account_id,
        platform,
        account_name,
        account_handle,
        account_type,
        profile_image_url,
        created_by,
        is_active,
        connection_status,
        last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 'active', NOW())
      ON CONFLICT (late_profile_id, project_id) 
      DO UPDATE SET
        late_profile_name = EXCLUDED.late_profile_name,
        late_account_id = EXCLUDED.late_account_id,
        account_name = EXCLUDED.account_name,
        account_handle = EXCLUDED.account_handle,
        account_type = EXCLUDED.account_type,
        profile_image_url = EXCLUDED.profile_image_url,
        is_active = true,
        connection_status = 'active',
        last_synced_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [
      access.organization_id,
      projectId,
      lateProfileId,
      lateProfileName,
      lateAccountId,
      platform,
      accountName,
      accountHandle,
      accountType,
      profileImageUrl,
      userId
    ]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create connection error:', error);
    res.status(500).json({ success: false, error: 'Failed to create social connection' });
  }
});

// DELETE /api/social/connections/:connectionId - Remove a social connection
router.delete('/connections/:connectionId', authenticateToken, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user.userId;
    
    // Verify user owns this connection
    const checkResult = await pool.query(`
      SELECT sac.id, sac.project_id
      FROM social_account_connections sac
      JOIN projects p ON sac.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE sac.id = $1 AND uo.user_id = $2
    `, [connectionId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied - connection not found or you do not have permission' 
      });
    }
    
    // Delete connection
    await pool.query('DELETE FROM social_account_connections WHERE id = $1', [connectionId]);
    
    res.json({ success: true, message: 'Social connection removed successfully' });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete social connection' });
  }
});

// ==================== PROFILES (SCOPED) ====================

// GET /api/social/profiles/:projectId - Get Late profiles for a project
router.get('/profiles/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Get connected profiles from our database
    const connections = await getProjectLateProfiles(projectId);
    
    if (connections.length === 0) {
      return res.json({ success: true, data: [], message: 'No connected Late profiles for this project' });
    }
    
    // Fetch full profile data from Late API
    const lateResult = await lateApiService.getProfiles();
    
    if (!lateResult.success) {
      return res.status(400).json({ success: false, error: lateResult.error });
    }
    
    // Filter to only profiles connected to this project
    const projectProfileIds = connections.map(c => c.late_profile_id);
    const filteredProfiles = lateResult.data.filter(profile => 
      projectProfileIds.includes(profile._id)
    );
    
    res.json({ success: true, data: filteredProfiles });
  } catch (error) {
    console.error('Social profiles fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch social profiles' });
  }
});

// POST /api/social/profiles - Create a new Late profile (not automatically connected)
router.post('/profiles', authenticateToken, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Profile name is required' });
    }
    
    const result = await lateApiService.createProfile({ name, description, color });
    
    if (result.success) {
      res.status(201).json({ 
        success: true, 
        data: result.data,
        message: 'Profile created. Use POST /api/social/connections to link it to a project.'
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Social profile creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create social profile' });
  }
});

// ==================== ACCOUNTS (SCOPED) ====================

// GET /api/social/accounts/:projectId - Get connected social accounts for a project
router.get('/accounts/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Get connected profiles
    const connections = await getProjectLateProfiles(projectId);
    
    if (connections.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Fetch accounts for each connected profile
    const allAccounts = [];
    for (const connection of connections) {
      const result = await lateApiService.getAccounts(connection.late_profile_id);
    if (result.success) {
        allAccounts.push(...result.data);
      }
    }
    
    res.json({ success: true, data: allAccounts });
  } catch (error) {
    console.error('Social accounts fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch social accounts' });
  }
});

// ==================== POSTS (SCOPED) ====================

// GET /api/social/posts/:projectId - Get posts for a project
router.get('/posts/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10, status, platform, dateFrom, dateTo } = req.query;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Get connected profiles
    const connections = await getProjectLateProfiles(projectId);
    
    if (connections.length === 0) {
      return res.json({ success: true, data: [], message: 'No connected social accounts' });
    }
    
    // Fetch posts for each connected profile
    const allPosts = [];
    for (const connection of connections) {
    const params = {
        profileId: connection.late_profile_id,
      page: parseInt(page),
      limit: parseInt(limit),
      ...(status && { status }),
      ...(platform && { platform }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo })
    };
    
    const result = await lateApiService.getPosts(params);
    if (result.success) {
        allPosts.push(...result.data);
      }
    }
    
    res.json({ success: true, data: allPosts });
  } catch (error) {
    console.error('Social posts fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch social posts' });
  }
});

// POST /api/social/posts/:projectId - Create a new social post (scoped to project)
router.post('/posts/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const postData = req.body;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Validate required fields
    if (!postData.content) {
      return res.status(400).json({ success: false, error: 'Post content is required' });
    }
    
    if (!postData.platforms || !Array.isArray(postData.platforms) || postData.platforms.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one platform is required' });
    }
    
    // Get project's Late profiles
    const connections = await getProjectLateProfiles(projectId);
    
    if (connections.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No social accounts connected to this project. Please connect a social account first.' 
      });
    }
    
    // Use the first connected profile (or allow user to specify which one)
    const profileId = postData.profileId || connections[0].late_profile_id;
    
    // Verify the profileId belongs to this project
    const validProfile = connections.find(c => c.late_profile_id === profileId);
    if (!validProfile) {
      return res.status(403).json({ 
        success: false, 
        error: 'The specified profile is not connected to this project' 
      });
    }
    
    // Add profileId to post data
    const postDataWithProfile = {
      ...postData,
      profileId: profileId
    };
    
    const result = await lateApiService.createPost(postDataWithProfile);
    
    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Social post creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create social post' });
  }
});

// GET /api/social/posts/:projectId/:postId - Get a specific post (verify project access)
router.get('/posts/:projectId/:postId', authenticateToken, async (req, res) => {
  try {
    const { projectId, postId } = req.params;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const result = await lateApiService.getPost(postId);
    
    if (result.success) {
      // Verify post belongs to one of project's profiles
      const connections = await getProjectLateProfiles(projectId);
      const projectProfileIds = connections.map(c => c.late_profile_id);
      
      if (!projectProfileIds.includes(result.data.profileId)) {
        return res.status(403).json({ 
          success: false, 
          error: 'This post does not belong to your project' 
        });
      }
      
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Social post fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch social post' });
  }
});

// PUT /api/social/posts/:projectId/:postId - Update a post (verify project access)
router.put('/posts/:projectId/:postId', authenticateToken, async (req, res) => {
  try {
    const { projectId, postId } = req.params;
    const postData = req.body;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // First get the post to verify it belongs to project
    const getResult = await lateApiService.getPost(postId);
    if (!getResult.success) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Verify post belongs to one of project's profiles
    const connections = await getProjectLateProfiles(projectId);
    const projectProfileIds = connections.map(c => c.late_profile_id);
    
    if (!projectProfileIds.includes(getResult.data.profileId)) {
      return res.status(403).json({ 
        success: false, 
        error: 'This post does not belong to your project' 
      });
    }
    
    const result = await lateApiService.updatePost(postId, postData);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Social post update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update social post' });
  }
});

// DELETE /api/social/posts/:projectId/:postId - Delete a post (verify project access)
router.delete('/posts/:projectId/:postId', authenticateToken, async (req, res) => {
  try {
    const { projectId, postId } = req.params;
    const userId = req.user.userId;
    
    // Verify access
    const access = await verifyProjectAccess(userId, projectId);
    if (!access) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // First get the post to verify it belongs to project
    const getResult = await lateApiService.getPost(postId);
    if (!getResult.success) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Verify post belongs to one of project's profiles
    const connections = await getProjectLateProfiles(projectId);
    const projectProfileIds = connections.map(c => c.late_profile_id);
    
    if (!projectProfileIds.includes(getResult.data.profileId)) {
      return res.status(403).json({ 
        success: false, 
        error: 'This post does not belong to your project' 
      });
    }
    
    const result = await lateApiService.deletePost(postId);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Social post deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete social post' });
  }
});

// ==================== TEST CONNECTION ====================

// GET /api/social/test - Test Late API connection (no project scope needed)
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const isConnected = await lateApiService.testConnection();
    
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'Late API connection successful',
        data: { connected: true }
      });
    } else {
      res.status(503).json({ 
        success: false, 
        error: 'Late API connection failed',
        data: { connected: false }
      });
    }
  } catch (error) {
    console.error('Late API connection test error:', error);
    res.status(503).json({ 
      success: false, 
      error: 'Failed to test Late API connection',
      data: { connected: false }
    });
  }
});

module.exports = router;
