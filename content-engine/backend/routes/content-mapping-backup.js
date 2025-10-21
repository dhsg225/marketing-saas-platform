const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/content-mapping/:projectId/import-content
 * Import AI-extracted content items into the content_ideas table
 */
router.post('/:projectId/import-content', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { contentItems, sourceDocument } = req.body;

    if (!contentItems || !Array.isArray(contentItems)) {
      return res.status(400).json({
        success: false,
        error: 'Content items array is required'
      });
    }

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $1`,
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

    for (let i = 0; i < contentItems.length; i++) {
      const item = contentItems[i];
      
      try {
        // Parse date - handle various formats
        let suggestedDate = null;
        if (item.date) {
          const dateStr = item.date;
          // Try to parse the date
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            suggestedDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        }

        // Determine post type based on content type
        let postTypeId = null;
        if (item.type) {
          const typeMapping = {
            'Promotional': 'promotional',
            'Product showcase': 'product',
            'Event promotion': 'event',
            'Educational': 'educational',
            'Engagement': 'engagement'
          };
          
          const mappedType = typeMapping[item.type] || 'general';
          
          // Find or create post type
          const postTypeResult = await query(
            `SELECT id FROM post_types 
             WHERE project_id = $1 AND name LIKE $1 AND is_active = true`,
            [projectId, `%${mappedType}%`]
          );
          
          if (postTypeResult.rows.length > 0) {
            postTypeId = postTypeResult.rows[0].id;
          } else {
            // Create new post type
            const newPostType = await query(
              `INSERT INTO post_types (project_id, name, purpose, tone, color, ai_instructions, is_active)
               VALUES ($1, $1, $1, $1, $1, $1, true)
               RETURNING id`,
              [projectId, item.type, 'AI Generated', 'Professional', '#3B82F6', `Generate content for ${item.type} posts`]
            );
            postTypeId = newPostType.rows[0].id;
          }
        }

        // Create content idea
        const contentIdea = await query(
          `INSERT INTO content_ideas (
            project_id, 
            title, 
            description, 
            suggested_date, 
            status, 
            created_by
          ) VALUES ($1, $1, $1, $1, $1, $1)
          RETURNING id, title, description, suggested_date`,
          [
            projectId,
            item.title || `Content Item ${i + 1}`,
            item.description || '',
            suggestedDate,
            'draft',
            userId
          ]
        );

        const createdItem = contentIdea.rows[0];
        
        // Add hashtags if present
        if (item.hashtags && item.hashtags.length > 0) {
          for (const hashtag of item.hashtags) {
            try {
              await query(
                `INSERT INTO content_hashtags (content_idea_id, hashtag, usage_count)
                 VALUES ($1, $1, 1)
                 ON CONFLICT (content_idea_id, hashtag) 
                 DO UPDATE SET usage_count = content_hashtags.usage_count + 1`,
                [createdItem.id, hashtag]
              );
            } catch (hashtagError) {
              console.warn(`Failed to add hashtag ${hashtag}:`, hashtagError.message);
            }
          }
        }

        importedItems.push(createdItem);
        console.log(`✅ Imported: ${createdItem.title}`);

      } catch (itemError) {
        console.error(`❌ Failed to import item ${i + 1}:`, itemError.message);
        errors.push({
          itemIndex: i,
          title: item.title || `Item ${i + 1}`,
          error: itemError.message
        });
      }
    }

    console.log(`🎉 Import complete: ${importedItems.length} items imported, ${errors.length} errors`);

    res.json({
      success: true,
      data: {
        importedCount: importedItems.length,
        errorCount: errors.length,
        importedItems: importedItems,
        errors: errors
      },
      message: `Successfully imported ${importedItems.length} content items${errors.length > 0 $1 ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('Content mapping error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import content items'
    });
  }
});

/**
 * GET /api/content-mapping/:projectId/imported-content
 * Get content items that were imported from AI processing
 */
router.get('/:projectId/imported-content', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT p.id FROM projects p
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE p.id = $1 AND uo.user_id = $1`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Get AI-generated content ideas
    const contentIdeas = await query(
      `SELECT 
        ci.*,
        pt.name as post_type_name,
        pt.color as post_type_color,
        u.name as created_by_name
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN users u ON ci.created_by = u.id
      WHERE ci.project_id = $1 AND ci.ai_generated = true
      ORDER BY ci.suggested_date ASC, ci.created_at DESC`,
      [projectId]
    );

    res.json({
      success: true,
      data: {
        contentIdeas: contentIdeas.rows,
        totalCount: contentIdeas.rows.length
      }
    });

  } catch (error) {
    console.error('Get imported content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch imported content'
    });
  }
});

module.exports = router;
