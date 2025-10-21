const express = require('express');
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * Import AI-extracted content into a project
 * POST /api/content-mapping/:projectId/import-content
 */
router.post('/:projectId/import-content', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { contentItems, sourceDocument } = req.body;
    const userId = req.user.userId;

    console.log(`🔄 Content mapping import request for project ${projectId}`);
    console.log(`📝 Content items: ${contentItems?.length || 0}`);
    console.log(`📄 Source document: ${sourceDocument || 'Unknown'}`);

    if (!contentItems || !Array.isArray(contentItems) || contentItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content items array is required'
      });
    }

    // Verify project access
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    console.log(`🔄 Importing ${contentItems.length} content items to project ${projectId}`);

    const importedItems = [];
    const errors = [];

    for (const item of contentItems) {
      try {
        // Map content type to our system
        const typeMapping = {
          'Feed Post': 'feed',
          'Story': 'story',
          'Reel': 'reel',
          'Video': 'video',
          'Carousel': 'carousel',
          'Promotional': 'promotional',
          'Educational': 'educational',
          'Entertainment': 'entertainment'
        };

        const mappedType = typeMapping[item.type] || 'general';
        
        // Find or create post type
        const postTypeResult = await query(
          `SELECT id FROM post_types 
           WHERE project_id = $1 AND name LIKE $2 AND is_active = true`,
          [projectId, `%${mappedType}%`]
        );
        
        let postTypeId;
        if (postTypeResult.rows.length > 0) {
          postTypeId = postTypeResult.rows[0].id;
        } else {
          // Create new post type
          const newPostType = await query(
            `INSERT INTO post_types (project_id, name, purpose, tone, color, ai_instructions, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING id`,
            [projectId, item.type, 'AI Generated', 'Professional', '#3B82F6', `Generate content for ${item.type} posts`]
          );
          postTypeId = newPostType.rows[0].id;
        }

        // Insert content idea (matching Supabase schema)
        const contentResult = await query(
          `INSERT INTO content_ideas (
            project_id, post_type_id, title, description, 
            suggested_date, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING id`,
          [
            projectId,
            postTypeId,
            item.title || 'AI Generated Content',
            item.description || '',
            item.date || new Date().toISOString().split('T')[0],
            userId
          ]
        );

        const contentId = contentResult.rows[0].id;

        // Note: Hashtags table doesn't exist in current Supabase schema
        // TODO: Add hashtag support when content_hashtags table is created

        importedItems.push({
          id: contentId,
          title: item.title,
          type: item.type
        });

        console.log(`✅ Imported content: ${item.title || 'Untitled'}`);

      } catch (itemError) {
        console.error(`❌ Error importing item:`, itemError);
        errors.push({
          item: item.title || 'Untitled',
          error: itemError.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        importedCount: importedItems.length,
        totalItems: contentItems.length,
        errors: errors,
        importedItems: importedItems
      },
      message: `Successfully imported ${importedItems.length} content items${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('❌ Content mapping import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import content items'
    });
  }
});

/**
 * Get content mapping history for a project
 * GET /api/content-mapping/:projectId/history
 */
router.get('/:projectId/history', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify project access
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Get AI-generated content for this project
    const contentResult = await query(
      `SELECT ci.*, pt.name as post_type_name, pt.color as post_type_color
       FROM content_ideas ci
       LEFT JOIN post_types pt ON ci.post_type_id = pt.id
       WHERE ci.project_id = $1 AND ci.ai_generated = true
       ORDER BY ci.created_at DESC
       LIMIT 50`,
      [projectId]
    );

    res.json({
      success: true,
      data: {
        contentItems: contentResult.rows,
        totalCount: contentResult.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Content mapping history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content mapping history'
    });
  }
});

module.exports = router;
