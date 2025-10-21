// [2025-10-20] - Content List API Routes
// Handles content ideas with approval status for the Content List page

const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

// Get content items grouped by stage for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status_filter } = req.query; // 'all', 'approved', 'unapproved'
    
    console.log('🔍 Content-List API: Fetching content list for project:', projectId, 'by user:', req.user.id, 'with filter:', status_filter);
    
    // First, check if the project exists
    const projectCheck = await query('SELECT id, name FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) {
      console.log('❌ Project not found:', projectId);
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    console.log('✅ Project found:', projectCheck.rows[0].name);
    
    // Build the base query
    let whereClause = 'WHERE ci.project_id = $1 AND (ci.suggested_date IS NULL OR ci.suggested_date >= \'2025-01-01\')';
    let queryParams = [projectId];
    
    // Add status filter if provided (Updated for Two-Stage Approval)
    if (status_filter && status_filter !== 'all') {
      if (status_filter === 'approved') {
        // Show content that has been approved at any stage (concept or publish)
        whereClause += ' AND (ci.status = $2 OR ci.status = $3 OR ci.status = $4 OR ci.status = $5)';
        queryParams.push('concept_approved', 'ready_to_publish', 'published', 'approved');
      } else if (status_filter === 'unapproved') {
        // Show content that hasn't been approved yet
        whereClause += ' AND ci.status NOT IN ($2, $3, $4, $5)';
        queryParams.push('concept_approved', 'ready_to_publish', 'published', 'approved');
      }
    }
    
    const contentQuery = `
      SELECT 
        ci.id,
        ci.title,
        ci.description,
        ci.status,
        ci.priority,
        ci.suggested_date,
        ci.suggested_time,
        ci.created_at,
        ci.updated_at,
        ci.approved_by,
        ci.approved_at,
        ci.created_by,
        pt.name as post_type_name,
        pt.color as post_type_color,
        u.name as created_by_name,
        approver.name as approved_by_name,
        -- Determine stage based on status and other factors (Updated for Two-Stage Approval)
        CASE 
          WHEN ci.status = 'draft' THEN 'ideas'
          WHEN ci.status = 'concept_approved' THEN 'concept_approved'
          WHEN ci.status = 'in_development' THEN 'in_development'
          WHEN ci.status = 'ready_to_publish' THEN 'ready_to_publish'
          WHEN ci.status = 'published' THEN 'published'
          WHEN ci.status = 'approved' THEN 'concept_approved' -- Legacy: treat old 'approved' as concept_approved
          WHEN ci.status = 'in_progress' THEN 'in_development' -- Legacy: map old in_progress to in_development
          WHEN ci.status = 'assets_attached' THEN 'in_development' -- Legacy: map old assets_attached to in_development
          ELSE 'ideas'
        END as stage,
        -- Add approval status for filtering (Updated for Two-Stage Approval)
        CASE 
          WHEN ci.status IN ('concept_approved', 'ready_to_publish', 'published', 'approved') THEN 'approved'
          ELSE 'unapproved'
        END as approval_status
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN users u ON ci.created_by = u.id
      LEFT JOIN users approver ON ci.approved_by = approver.id
      ${whereClause}
      ORDER BY ci.suggested_date ASC, ci.created_at DESC
    `;
    
    const result = await query(contentQuery, queryParams);
    
    // Group content by stage (Updated for Two-Stage Approval Workflow)
    const groupedContent = {
      ideas: [],
      concept_approved: [],
      in_development: [],
      ready_to_publish: [],
      published: []
    };
    
    result.rows.forEach(item => {
      let stage = item.stage || 'ideas';
      
      // Handle transition from old stage names to new ones
      if (stage === 'in_progress') {
        stage = 'in_development';
      } else if (stage === 'assets_attached') {
        stage = 'in_development';
      }
      
      if (groupedContent[stage]) {
        groupedContent[stage].push({
          id: item.id,
          title: item.title,
          description: item.description,
          content_type: item.post_type_name || 'post',
          stage: stage,
          priority: item.priority,
          due_date: item.suggested_date,
          suggested_date: item.suggested_date,
          suggested_time: item.suggested_time,
          content_text: item.description,
          created_at: item.created_at,
          updated_at: item.updated_at,
          created_by: item.created_by,
          created_by_name: item.created_by_name,
          assigned_user_id: item.approved_by,
          assigned_user_name: item.approved_by_name,
          stage_order: getStageOrder(stage),
          // Add approval-specific fields
          status: item.status,
          approval_status: item.approval_status,
          approved_at: item.approved_at,
          post_type_name: item.post_type_name,
          post_type_color: item.post_type_color
        });
      }
    });
    
    console.log('📊 Content-List API: Content grouped by stage:', {
      ideas: groupedContent.ideas.length,
      concept_approved: groupedContent.concept_approved.length,
      in_development: groupedContent.in_development.length,
      ready_to_publish: groupedContent.ready_to_publish.length,
      published: groupedContent.published.length
    });
    
    console.log('📊 Content-List API: Raw query result count:', result.rows.length);
    
    res.json({
      success: true,
      data: groupedContent,
      filters: {
        status_filter: status_filter || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Content list fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch content list' 
    });
  }
});

// Helper function to get stage order for sorting (Updated for Two-Stage Approval)
function getStageOrder(stage) {
  const order = {
    'ideas': 1,
    'concept_approved': 2,
    'in_development': 3,
    'ready_to_publish': 4,
    'published': 5
  };
  return order[stage] || 1;
}

module.exports = router;