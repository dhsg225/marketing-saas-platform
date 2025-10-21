// [2025-10-17] - Dashboard API Routes
// Provides data for dashboard components including recent activity and upcoming content

const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../../middleware/auth');

// Get dashboard data for a user
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's projects
    const projectsQuery = `
      SELECT p.id, p.name, p.status
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      JOIN user_organizations uo ON c.organization_id = uo.organization_id
      WHERE uo.user_id = $1 AND p.status = 'active'
      ORDER BY p.created_at DESC
    `;
    
    const projectsResult = await query(projectsQuery, [userId]);
    const projectIds = projectsResult.rows.map(p => p.id);
    
    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: {
          upcomingContent: [],
          recentContent: [],
          recentActivity: [],
          stats: {
            totalContent: 0,
            activeProjects: 0,
            thisMonth: 0,
            successRate: '0%'
          }
        }
      });
    }
    
    // Get upcoming content (next 5 posts by suggested_date)
    const upcomingQuery = `
      SELECT 
        ci.id,
        ci.title,
        ci.description,
        ci.suggested_date,
        ci.status,
        pt.name as post_type_name,
        pt.color as post_type_color,
        p.name as project_name
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN projects p ON ci.project_id = p.id
      WHERE ci.project_id = ANY($1)
        AND ci.suggested_date >= CURRENT_DATE
        AND ci.status IN ('draft', 'review', 'approved', 'scheduled')
      ORDER BY ci.suggested_date ASC
      LIMIT 5
    `;
    
    // Get recent content (last 5 created/updated)
    const recentQuery = `
      SELECT 
        ci.id,
        ci.title,
        ci.description,
        ci.suggested_date,
        ci.status,
        ci.created_at,
        ci.updated_at,
        pt.name as post_type_name,
        pt.color as post_type_color,
        p.name as project_name
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN projects p ON ci.project_id = p.id
      WHERE ci.project_id = ANY($1)
      ORDER BY COALESCE(ci.updated_at, ci.created_at) DESC
      LIMIT 5
    `;
    
    // Get recent activity from real database data
    const recentActivityQuery = `
      SELECT 
        'content_created' as action_type,
        'Created new content idea' as action,
        ci.title as description,
        ci.created_at as timestamp,
        '✨' as icon,
        'blue' as color,
        p.name as project_name,
        c.company_name as client_name,
        u.name as user_name,
        'New content idea "' || ci.title || '" was created for ' || p.name || ' project' as explainer
      FROM content_ideas ci
      LEFT JOIN projects p ON ci.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON ci.created_by = u.id
      WHERE ci.project_id = ANY($1)
        AND ci.created_at >= NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'content_approved' as action_type,
        'Approved content idea' as action,
        ci.title as description,
        ci.approved_at as timestamp,
        '✅' as icon,
        'green' as color,
        p.name as project_name,
        c.company_name as client_name,
        u.name as user_name,
        'Content idea "' || ci.title || '" was approved and is ready for publishing' as explainer
      FROM content_ideas ci
      LEFT JOIN projects p ON ci.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON ci.approved_by = u.id
      WHERE ci.project_id = ANY($1)
        AND ci.approved_at >= NOW() - INTERVAL '7 days'
        AND ci.approved_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'asset_uploaded' as action_type,
        'Uploaded new asset' as action,
        a.file_name as description,
        a.created_at as timestamp,
        '📁' as icon,
        'purple' as color,
        p.name as project_name,
        c.company_name as client_name,
        u.name as user_name,
        'New asset "' || a.file_name || '" was uploaded to ' || p.name || ' project' as explainer
      FROM assets a
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON a.owner_user_id = u.id
      WHERE a.project_id = ANY($1)
        AND a.created_at >= NOW() - INTERVAL '7 days'
      
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    const recentActivityResult = await query(recentActivityQuery, [projectIds]);
    const recentActivity = recentActivityResult.rows.map(row => ({
      id: row.action_type + '_' + row.timestamp.getTime(),
      action: row.action,
      description: row.description,
      timestamp: row.timestamp,
      icon: row.icon,
      color: row.color,
      project_name: row.project_name,
      client_name: row.client_name,
      user_name: row.user_name,
      explainer: row.explainer
    }));
    
    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(ci.id) as total_content,
        COUNT(DISTINCT p.id) as active_projects,
        COUNT(CASE WHEN ci.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as this_month,
        COUNT(CASE WHEN ci.status = 'approved' THEN 1 END) as approved_content
      FROM content_ideas ci
      JOIN projects p ON ci.project_id = p.id
      WHERE ci.project_id = ANY($1)
    `;
    
    // Get recent communications (simulated for now - would need a communications table)
    const recentCommunications = [
      {
        id: 1,
        type: 'client_message',
        subject: 'Content approval needed',
        message: 'Please review the latest batch of content ideas for Matts Place',
        from: 'Matt Johnson',
        to: 'Shannon Green',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        project_name: 'Matts Place',
        client_name: 'Matt Johnson',
        priority: 'high',
        status: 'unread'
      },
      {
        id: 2,
        type: 'internal_note',
        subject: 'Campaign performance update',
        message: 'Q4 campaign showing 15% increase in engagement',
        from: 'Shannon Green',
        to: 'Team',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        project_name: 'Big Poppa',
        client_name: 'Big Poppa Inc',
        priority: 'medium',
        status: 'read'
      }
    ];

    // Get imminent posts (next 24 hours)
    const imminentPostsQuery = `
      SELECT 
        ci.id,
        ci.title,
        ci.description,
        ci.suggested_date,
        ci.suggested_time,
        ci.status,
        pt.name as post_type_name,
        pt.color as post_type_color,
        p.name as project_name,
        c.company_name as client_name
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN projects p ON ci.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE ci.project_id = ANY($1)
        AND ci.suggested_date >= CURRENT_DATE
        AND ci.suggested_date <= CURRENT_DATE + INTERVAL '1 day'
        AND ci.status IN ('approved', 'scheduled')
      ORDER BY ci.suggested_date ASC, ci.suggested_time ASC
      LIMIT 5
    `;

    // Get recent analytics (simulated for now - would need analytics table)
    const recentAnalytics = [
      {
        id: 1,
        project_name: 'Matts Place',
        client_name: 'Matt Johnson',
        metric: 'engagement_rate',
        value: 8.5,
        change: '+2.3%',
        period: '24h',
        timestamp: new Date()
      },
      {
        id: 2,
        project_name: 'Big Poppa',
        client_name: 'Big Poppa Inc',
        metric: 'click_through_rate',
        value: 3.2,
        change: '+0.8%',
        period: '24h',
        timestamp: new Date()
      }
    ];

    // Get AI-suggested to-dos (simulated for now - would integrate with AI service)
    const aiSuggestedTodos = [
      {
        id: 1,
        task: 'Follow up on client feedback',
        description: 'Matt Johnson requested changes to the latest content batch',
        project_name: 'Matts Place',
        client_name: 'Matt Johnson',
        priority: 'high',
        confidence: 0.9,
        category: 'client_communication',
        suggested_action: 'Schedule a call to discuss content revisions',
        estimated_time: '30 minutes'
      },
      {
        id: 2,
        task: 'Add visuals to draft content',
        description: '3 approved content ideas are missing accompanying images',
        project_name: 'Big Poppa',
        client_name: 'Big Poppa Inc',
        priority: 'medium',
        confidence: 0.8,
        category: 'content_optimization',
        suggested_action: 'Generate or upload images for pending content',
        estimated_time: '1 hour'
      },
      {
        id: 3,
        task: 'Schedule next week\'s campaign',
        description: 'No content scheduled for next week\'s campaign launch',
        project_name: 'Matts Place',
        client_name: 'Matt Johnson',
        priority: 'high',
        confidence: 0.95,
        category: 'content_planning',
        suggested_action: 'Create and schedule campaign content for next week',
        estimated_time: '2 hours'
      }
    ];

    const [upcomingResult, recentResult, statsResult, imminentResult] = await Promise.all([
      query(upcomingQuery, [projectIds]),
      query(recentQuery, [projectIds]),
      query(statsQuery, [projectIds]),
      query(imminentPostsQuery, [projectIds])
    ]);
    
    const stats = statsResult.rows[0];
    const totalContent = parseInt(stats.total_content) || 0;
    const approvedContent = parseInt(stats.approved_content) || 0;
    const successRate = totalContent > 0 ? Math.round((approvedContent / totalContent) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        upcomingContent: upcomingResult.rows,
        recentContent: recentResult.rows,
        recentActivity,
        recentCommunications,
        imminentPosts: imminentResult.rows,
        recentAnalytics,
        aiSuggestedTodos,
        stats: {
          totalContent,
          activeProjects: parseInt(stats.active_projects) || 0,
          thisMonth: parseInt(stats.this_month) || 0,
          successRate: `${successRate}%`
        }
      }
    });
    
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// Get quick actions based on recent activity
router.get('/quick-actions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's recent activities from the database
    const recentActivities = await query(`
      SELECT action_type, action_description, metadata, created_at
      FROM user_activities 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 8
    `, [userId]);
    
    // Map action types to UI components
    const actionTypeMap = {
      'generate_content': {
        title: 'Generate More Content',
        description: 'Create new content ideas',
        icon: '✨',
        link: '/generate',
        color: 'primary'
      },
      'upload_document': {
        title: 'Upload Documents',
        description: 'Process client documents with AI',
        icon: '📄',
        link: '/reference-documents',
        color: 'secondary'
      },
      'view_analytics': {
        title: 'View Analytics',
        description: 'Check content performance',
        icon: '📊',
        link: '/analytics',
        color: 'success'
      },
      'schedule_post': {
        title: 'Schedule Posts',
        description: 'Manage your content calendar',
        icon: '📅',
        link: '/calendar',
        color: 'accent'
      },
      'manage_projects': {
        title: 'Manage Projects',
        description: 'Organize your projects',
        icon: '📁',
        link: '/projects',
        color: 'warning'
      },
      'talent_marketplace': {
        title: 'Talent Marketplace',
        description: 'Find creative professionals',
        icon: '👥',
        link: '/talent-marketplace',
        color: 'info'
      },
      'client_collaboration': {
        title: 'Client Collaboration',
        description: 'Collaborate with clients',
        icon: '🤝',
        link: '/client-collaboration',
        color: 'purple'
      },
      'settings': {
        title: 'Settings',
        description: 'Configure your preferences',
        icon: '⚙️',
        link: '/settings',
        color: 'gray'
      }
    };
    
    // Convert recent activities to quick actions
    const recentActions = recentActivities.rows.map((activity, index) => {
      const actionConfig = actionTypeMap[activity.action_type] || {
        title: 'Recent Action',
        description: activity.action_description,
        icon: '⚡',
        link: '/',
        color: 'gray'
      };
      
      return {
        id: index + 1,
        title: actionConfig.title,
        description: actionConfig.description,
        icon: actionConfig.icon,
        link: actionConfig.link,
        color: actionConfig.color,
        reason: `You ${activity.action_description.toLowerCase()}`,
        timestamp: activity.created_at
      };
    });
    
    // If no recent activities, show default actions
    if (recentActions.length === 0) {
      const defaultActions = [
        {
          id: 1,
          title: 'Generate Content',
          description: 'Create new content ideas',
          icon: '✨',
          link: '/generate',
          color: 'primary',
          reason: 'Start creating content'
        },
        {
          id: 2,
          title: 'Upload Documents',
          description: 'Process client documents with AI',
          icon: '📄',
          link: '/reference-documents',
          color: 'secondary',
          reason: 'Upload your first document'
        },
        {
          id: 3,
          title: 'Schedule Posts',
          description: 'Manage your content calendar',
          icon: '📅',
          link: '/calendar',
          color: 'accent',
          reason: 'Plan your content schedule'
        },
        {
          id: 4,
          title: 'View Analytics',
          description: 'Check content performance',
          icon: '📊',
          link: '/analytics',
          color: 'success',
          reason: 'Track your content success'
        }
      ];
      
      res.json({ success: true, data: defaultActions });
    } else {
      res.json({ success: true, data: recentActions });
    }
    
  } catch (error) {
    console.error('Quick actions fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quick actions' });
  }
});

module.exports = router;
