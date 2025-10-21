const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../../database/config');

// =====================================================
// CLIENT PORTAL USERS MANAGEMENT
// =====================================================

// Get client portal users for a client
router.get('/clients/:clientId/users', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this client
    const clientCheck = await query(
      `SELECT c.id FROM clients c
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE c.id = $1 AND uo.user_id = $2`,
      [clientId, userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    const result = await query(
      `SELECT cpu.*, cpa.project_id, cpa.access_level, cpa.expires_at as access_expires_at
       FROM client_portal_users cpu
       LEFT JOIN client_project_access cpa ON cpu.id = cpa.client_portal_user_id AND cpa.is_active = true
       WHERE cpu.client_id = $1 AND cpu.is_active = true
       ORDER BY cpu.created_at DESC`,
      [clientId]
    );

    // Group users with their project access
    const users = {};
    result.rows.forEach(row => {
      if (!users[row.id]) {
        users[row.id] = {
          id: row.id,
          client_id: row.client_id,
          email: row.email,
          name: row.name,
          role: row.role,
          is_active: row.is_active,
          last_login_at: row.last_login_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          project_access: []
        };
      }
      
      if (row.project_id) {
        users[row.id].project_access.push({
          project_id: row.project_id,
          access_level: row.access_level,
          expires_at: row.access_expires_at
        });
      }
    });

    res.json({ users: Object.values(users) });

  } catch (error) {
    console.error('Error fetching client portal users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new client portal user
router.post('/clients/:clientId/users', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { email, name, role, project_access } = req.body;
    const userId = req.user.userId;

    // Verify user has access to this client
    const clientCheck = await query(
      `SELECT c.id FROM clients c
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE c.id = $1 AND uo.user_id = $2`,
      [clientId, userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    // Create client portal user
    const userResult = await query(
      `INSERT INTO client_portal_users (client_id, email, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, email, name, role || 'viewer']
    );

    const clientUser = userResult.rows[0];

    // Add project access if provided
    if (project_access && project_access.length > 0) {
      for (const access of project_access) {
        await query(
          `INSERT INTO client_project_access (client_portal_user_id, project_id, access_level, granted_by)
           VALUES ($1, $2, $3, $4)`,
          [clientUser.id, access.project_id, access.access_level || 'view', userId]
        );
      }
    }

    res.status(201).json({ user: clientUser });

  } catch (error) {
    console.error('Error creating client portal user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update client portal user
router.put('/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, role, is_active } = req.body;
    const currentUserId = req.user.userId;

    // Verify user has access to this client portal user
    const userCheck = await query(
      `SELECT cpu.id FROM client_portal_users cpu
       JOIN clients c ON cpu.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE cpu.id = $1 AND uo.user_id = $2`,
      [userId, currentUserId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client portal user not found or access denied' });
    }

    const result = await query(
      `UPDATE client_portal_users 
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, role, is_active, userId]
    );

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Error updating client portal user:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// PROJECT ACCESS MANAGEMENT
// =====================================================

// Grant project access to client portal user
router.post('/users/:userId/project-access', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { project_id, access_level, expires_at } = req.body;
    const currentUserId = req.user.userId;

    // Verify user has access to this client portal user
    const userCheck = await query(
      `SELECT cpu.id FROM client_portal_users cpu
       JOIN clients c ON cpu.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE cpu.id = $1 AND uo.user_id = $2`,
      [userId, currentUserId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client portal user not found or access denied' });
    }

    // Verify user has access to the project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [project_id, currentUserId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const result = await query(
      `INSERT INTO client_project_access (client_portal_user_id, project_id, access_level, granted_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (client_portal_user_id, project_id) 
       DO UPDATE SET access_level = EXCLUDED.access_level, expires_at = EXCLUDED.expires_at, updated_at = NOW()
       RETURNING *`,
      [userId, project_id, access_level || 'view', currentUserId, expires_at]
    );

    res.status(201).json({ access: result.rows[0] });

  } catch (error) {
    console.error('Error granting project access:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove project access from client portal user
router.delete('/users/:userId/project-access/:accessId', authenticateToken, async (req, res) => {
  try {
    const { userId, accessId } = req.params;
    const currentUserId = req.user.userId;

    // Verify user has access to this client portal user
    const userCheck = await query(
      `SELECT cpu.id FROM client_portal_users cpu
       JOIN clients c ON cpu.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE cpu.id = $1 AND uo.user_id = $2`,
      [userId, currentUserId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client portal user not found or access denied' });
    }

    await query(
      `UPDATE client_project_access 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND client_portal_user_id = $2`,
      [accessId, userId]
    );

    res.json({ success: true, message: 'Project access removed successfully' });

  } catch (error) {
    console.error('Error removing project access:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// APPROVAL WORKFLOWS
// =====================================================

// Get approval workflows for a project
router.get('/projects/:projectId/workflows', authenticateToken, async (req, res) => {
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

    const workflows = await query(
      `SELECT caw.*, u.name as created_by_name
       FROM content_approval_workflows caw
       JOIN users u ON caw.created_by = u.id
       WHERE caw.project_id = $1
       ORDER BY caw.created_at DESC`,
      [projectId]
    );

    // Get workflow steps for each workflow
    for (let workflow of workflows.rows) {
      const steps = await query(
        `SELECT * FROM approval_workflow_steps
         WHERE workflow_id = $1
         ORDER BY step_order`,
        [workflow.id]
      );
      workflow.steps = steps.rows;
    }

    res.json({ workflows: workflows.rows });

  } catch (error) {
    console.error('Error fetching approval workflows:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create approval workflow
router.post('/projects/:projectId/workflows', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, workflow_type, steps } = req.body;
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

    // Create workflow
    const workflowResult = await query(
      `INSERT INTO content_approval_workflows (project_id, name, description, workflow_type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, name, description, workflow_type || 'content', userId]
    );

    const workflow = workflowResult.rows[0];

    // Create workflow steps
    if (steps && steps.length > 0) {
      for (const step of steps) {
        await query(
          `INSERT INTO approval_workflow_steps (
             workflow_id, step_order, step_name, step_type, approver_type, 
             approver_id, approver_role, is_required, auto_approve_after_hours
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            workflow.id, step.step_order, step.step_name, step.step_type,
            step.approver_type, step.approver_id, step.approver_role,
            step.is_required !== false, step.auto_approve_after_hours
          ]
        );
      }
    }

    res.status(201).json({ workflow });

  } catch (error) {
    console.error('Error creating approval workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// APPROVAL REQUESTS
// =====================================================

// Get approval requests for a project
router.get('/projects/:projectId/approval-requests', authenticateToken, async (req, res) => {
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

    const requests = await query(
      `SELECT car.*, caw.name as workflow_name, u.name as requested_by_name, approver.name as approved_by_name
       FROM content_approval_requests car
       JOIN content_approval_workflows caw ON car.workflow_id = caw.id
       JOIN users u ON car.requested_by = u.id
       LEFT JOIN users approver ON car.approved_by = approver.id
       WHERE car.project_id = $1
       ORDER BY car.requested_at DESC`,
      [projectId]
    );

    res.json({ requests: requests.rows });

  } catch (error) {
    console.error('Error fetching approval requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create approval request
router.post('/projects/:projectId/approval-requests', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { workflow_id, content_type, content_id, content_title, content_preview, expires_at } = req.body;
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

    // Create approval request
    const requestResult = await query(
      `INSERT INTO content_approval_requests (
         project_id, workflow_id, content_type, content_id, content_title, 
         content_preview, requested_by, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [projectId, workflow_id, content_type, content_id, content_title, content_preview, userId, expires_at]
    );

    const request = requestResult.rows[0];

    // Create approval request steps based on workflow
    const workflowSteps = await query(
      `SELECT * FROM approval_workflow_steps
       WHERE workflow_id = $1
       ORDER BY step_order`,
      [workflow_id]
    );

    for (const step of workflowSteps.rows) {
      await query(
        `INSERT INTO approval_request_steps (approval_request_id, workflow_step_id)
         VALUES ($1, $2)`,
        [request.id, step.id]
      );
    }

    res.status(201).json({ request });

  } catch (error) {
    console.error('Error creating approval request:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// CLIENT FEEDBACK
// =====================================================

// Get client feedback for a project
router.get('/projects/:projectId/feedback', authenticateToken, async (req, res) => {
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

    const feedback = await query(
      `SELECT cf.*, cpu.name as client_user_name, u.name as resolved_by_name
       FROM client_feedback cf
       JOIN client_portal_users cpu ON cf.client_portal_user_id = cpu.id
       LEFT JOIN users u ON cf.resolved_by = u.id
       WHERE cf.project_id = $1
       ORDER BY cf.created_at DESC`,
      [projectId]
    );

    res.json({ feedback: feedback.rows });

  } catch (error) {
    console.error('Error fetching client feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create client feedback
router.post('/projects/:projectId/feedback', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { approval_request_id, content_type, content_id, client_portal_user_id, feedback_type, feedback_text, is_public } = req.body;
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

    const result = await query(
      `INSERT INTO client_feedback (
         approval_request_id, project_id, content_type, content_id, 
         client_portal_user_id, feedback_type, feedback_text, is_public
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [approval_request_id, projectId, content_type, content_id, client_portal_user_id, feedback_type, feedback_text, is_public || false]
    );

    res.status(201).json({ feedback: result.rows[0] });

  } catch (error) {
    console.error('Error creating client feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// COLLABORATION SESSIONS
// =====================================================

// Get collaboration sessions for a project
router.get('/projects/:projectId/sessions', authenticateToken, async (req, res) => {
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

    const sessions = await query(
      `SELECT cs.*, u.name as host_name
       FROM collaboration_sessions cs
       JOIN users u ON cs.host_user_id = u.id
       WHERE cs.project_id = $1
       ORDER BY cs.scheduled_start DESC`,
      [projectId]
    );

    // Get participants for each session
    for (let session of sessions.rows) {
      const participants = await query(
        `SELECT csp.*, 
                CASE 
                  WHEN csp.participant_type = 'client_user' THEN cpu.name
                  WHEN csp.participant_type = 'internal_user' THEN u.name
                END as participant_name
         FROM collaboration_session_participants csp
         LEFT JOIN client_portal_users cpu ON csp.participant_type = 'client_user' AND csp.participant_id = cpu.id
         LEFT JOIN users u ON csp.participant_type = 'internal_user' AND csp.participant_id = u.id
         WHERE csp.session_id = $1`,
        [session.id]
      );
      session.participants = participants.rows;
    }

    res.json({ sessions: sessions.rows });

  } catch (error) {
    console.error('Error fetching collaboration sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create collaboration session
router.post('/projects/:projectId/sessions', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { session_name, session_type, scheduled_start, scheduled_end, meeting_link, participants } = req.body;
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

    // Create session
    const sessionResult = await query(
      `INSERT INTO collaboration_sessions (
         project_id, session_name, session_type, host_user_id, 
         scheduled_start, scheduled_end, meeting_link
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [projectId, session_name, session_type, userId, scheduled_start, scheduled_end, meeting_link]
    );

    const session = sessionResult.rows[0];

    // Add participants
    if (participants && participants.length > 0) {
      for (const participant of participants) {
        await query(
          `INSERT INTO collaboration_session_participants (
             session_id, participant_id, participant_type, role
           )
           VALUES ($1, $2, $3, $4)`,
          [session.id, participant.participant_id, participant.participant_type, participant.role || 'participant']
        );
      }
    }

    res.status(201).json({ session });

  } catch (error) {
    console.error('Error creating collaboration session:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// SHARED ASSETS
// =====================================================

// Get shared assets for a project
router.get('/projects/:projectId/shared-assets', authenticateToken, async (req, res) => {
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

    const assets = await query(
      `SELECT sca.*, u.name as shared_by_name
       FROM shared_client_assets sca
       JOIN users u ON sca.shared_by = u.id
       WHERE sca.project_id = $1
       ORDER BY sca.shared_at DESC`,
      [projectId]
    );

    res.json({ assets: assets.rows });

  } catch (error) {
    console.error('Error fetching shared assets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Share asset with client
router.post('/projects/:projectId/shared-assets', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { asset_type, asset_name, asset_path, asset_url, description, is_public, access_level, expires_at, client_access } = req.body;
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

    // Create shared asset
    const assetResult = await query(
      `INSERT INTO shared_client_assets (
         project_id, asset_type, asset_name, asset_path, asset_url, 
         description, shared_by, is_public, access_level, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [projectId, asset_type, asset_name, asset_path, asset_url, description, userId, is_public || false, access_level || 'view', expires_at]
    );

    const asset = assetResult.rows[0];

    // Add specific client access if provided
    if (client_access && client_access.length > 0) {
      for (const access of client_access) {
        await query(
          `INSERT INTO shared_asset_access (asset_id, client_portal_user_id, access_level, granted_by, expires_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [asset.id, access.client_portal_user_id, access.access_level || 'view', userId, access.expires_at]
        );
      }
    }

    res.status(201).json({ asset });

  } catch (error) {
    console.error('Error sharing asset:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
