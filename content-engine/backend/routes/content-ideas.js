// [2025-10-09] - Content Ideas/Topics API Routes (FIXED)
// This handles CRUD operations for content ideas linked to Post Types

const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');
const { timezoneManager } = require('../utils/timezone');

// AI Content Idea Generation Function
async function generateAIContentIdeas({ postType, count, focus_areas, seasonal_themes, target_audience_insights }) {
  // This is a simulated AI generation - in production, integrate with OpenAI/Claude
  const ideas = [];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  
  // Generate ideas based on post type and context
  for (let i = 0; i < count; i++) {
    const idea = generateIdeaVariation(postType, i, focus_areas, seasonal_themes);
    ideas.push({
      title: idea.title,
      description: idea.description,
      topic_keywords: idea.keywords,
      suggested_date: getFutureDate(i),
      suggested_time: getRandomTime(),
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      notes: `AI Generated - ${postType.name} content idea`
    });
  }
  
  return ideas;
}

function generateIdeaVariation(postType, index, focus_areas, seasonal_themes) {
  const variations = {
    'Weekly Special': [
      { title: `Chef's Special Pasta`, description: 'Highlight our signature pasta dish with fresh ingredients', keywords: ['pasta', 'chef', 'special', 'fresh'] },
      { title: `Seasonal Soup Selection`, description: 'Feature our rotating seasonal soup menu', keywords: ['soup', 'seasonal', 'comfort', 'warm'] },
      { title: `Grilled Seafood Delight`, description: 'Showcase our premium grilled seafood options', keywords: ['seafood', 'grilled', 'premium', 'healthy'] },
      { title: `Vegetarian Power Bowl`, description: 'Promote our nutritious vegetarian options', keywords: ['vegetarian', 'healthy', 'bowl', 'nutritious'] },
      { title: `Dessert of the Week`, description: 'Feature our rotating dessert specials', keywords: ['dessert', 'sweet', 'indulgent', 'treat'] }
    ],
    'Ingredient Spotlight': [
      { title: `Local Farm Partnership`, description: 'Highlight our partnership with local farms', keywords: ['local', 'farm', 'fresh', 'community'] },
      { title: `Organic Produce Feature`, description: 'Showcase our commitment to organic ingredients', keywords: ['organic', 'fresh', 'healthy', 'sustainable'] },
      { title: `Seasonal Ingredient Focus`, description: 'Educate about seasonal cooking ingredients', keywords: ['seasonal', 'cooking', 'education', 'fresh'] },
      { title: `Artisan Cheese Selection`, description: 'Feature our curated artisan cheese collection', keywords: ['cheese', 'artisan', 'curated', 'premium'] },
      { title: `Spice of the Month`, description: 'Introduce customers to new spice varieties', keywords: ['spices', 'flavor', 'cooking', 'education'] }
    ]
  };
  
  const typeVariations = variations[postType.name] || variations['Weekly Special'];
  const baseVariation = typeVariations[index % typeVariations.length];
  
  // Add seasonal or focus area modifications
  if (seasonal_themes.length > 0) {
    const theme = seasonal_themes[index % seasonal_themes.length];
    baseVariation.title = `${theme} ${baseVariation.title}`;
    baseVariation.keywords.push(theme.toLowerCase());
  }
  
  return baseVariation;
}

function getFutureDate(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset + 1);
  return date.toISOString().split('T')[0];
}

function getRandomTime() {
  const hours = Math.floor(Math.random() * 12) + 11; // 11 AM to 10 PM
  const minutes = Math.random() < 0.5 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Get all content ideas for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log('🔍 Fetching content ideas for project:', projectId, 'by user:', req.user.id);
    
    // First, check if the project exists
    const projectCheck = await query('SELECT id, name FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) {
      console.log('❌ Project not found:', projectId);
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    console.log('✅ Project found:', projectCheck.rows[0].name);
    
    const offset = (page - 1) * limit;
    
    const ideasQuery = `
      SELECT 
        ci.*,
        pt.name as post_type_name,
        pt.purpose as post_type_purpose,
        pt.tone as post_type_tone,
        pt.color as post_type_color,
        u.name as created_by_name,
        approver.name as approved_by_name
      FROM content_ideas ci
      LEFT JOIN post_types pt ON ci.post_type_id = pt.id
      LEFT JOIN users u ON ci.created_by = u.id
      LEFT JOIN users approver ON ci.approved_by = approver.id
      WHERE ci.project_id = $1
        AND (ci.suggested_date IS NULL OR ci.suggested_date >= '2025-01-01')
      ORDER BY ci.suggested_date ASC, ci.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM content_ideas ci
      WHERE ci.project_id = $1
        AND (ci.suggested_date IS NULL OR ci.suggested_date >= '2025-01-01')
    `;
    
    const [ideasResult, countResult] = await Promise.all([
      query(ideasQuery, [projectId, limit, offset]),
      query(countQuery, [projectId])
    ]);
    
    console.log('📊 Query results:', {
      ideasCount: ideasResult.rows.length,
      totalCount: countResult.rows[0].total
    });
    
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
        pt.color as post_type_color,
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
      notes,
      image_prompt
    } = req.body;
    
    const created_by = req.user.id;
    
    const result = await query(`
      INSERT INTO content_ideas (
        project_id, post_type_id, title, description, topic_keywords,
        suggested_date, suggested_time, priority, notes, image_prompt, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      project_id, post_type_id, title, description, topic_keywords,
      suggested_date, suggested_time, priority, notes, image_prompt, created_by
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
    
    // Convert empty strings to null for time fields
    const processedSuggestedTime = suggested_time === '' ? null : suggested_time;
    
    // Handle timezone conversion for scheduling
    let scheduledAtUTC = null;
    let scheduledTimezone = null;
    const userId = req.user.userId || req.user.id;
    
    // Re-enable timezone conversion for proper date/time handling
    console.log(`🔍 Updating content idea ${id} with data:`, {
      title, description, suggested_date, suggested_time, priority, status, topic_keywords
    });
    
    if (suggested_date) {
      try {
        // Get user's timezone preference (default to Asia/Bangkok for now)
        const userTimezone = 'Asia/Bangkok'; // TODO: Get from user preferences
        scheduledTimezone = userTimezone;
        
        // Convert to UTC for storage
        if (processedSuggestedTime) {
          // Extract just the date part from the ISO string and combine with time
          const datePart = suggested_date.split('T')[0];
          const localDateTime = `${datePart} ${processedSuggestedTime}`;
          scheduledAtUTC = timezoneManager.convertToUTC(localDateTime, userTimezone);
        } else {
          // If no time specified, use midnight in user's timezone
          const datePart = suggested_date.split('T')[0];
          const localDateTime = `${datePart} 00:00:00`;
          scheduledAtUTC = timezoneManager.convertToUTC(localDateTime, userTimezone);
        }
        
        console.log(`🕐 Timezone conversion: ${suggested_date} ${processedSuggestedTime || '00:00:00'} (${userTimezone}) → ${scheduledAtUTC} (UTC)`);
        
        // Log the conversion (optional - can be disabled if logging table doesn't exist)
        try {
          await timezoneManager.logConversion(
            userId,
            id,
            'content_idea',
            `${suggested_date} ${processedSuggestedTime || '00:00:00'}`,
            userTimezone,
            scheduledAtUTC,
            'UTC',
            'to_utc'
          );
        } catch (logError) {
          console.log('⚠️ Timezone conversion logging failed (table may not exist):', logError.message);
        }
      } catch (error) {
        console.error('❌ CRITICAL: Timezone conversion failed!', {
          error: error.message,
          contentId: id,
          userId: userId,
          timestamp: new Date().toISOString(),
          suggestedDate: suggested_date,
          suggestedTime: processedSuggestedTime,
          userTimezone: 'Asia/Bangkok',
          userAction: 'content_idea_timezone_conversion'
        });
        
        return res.status(500).json({ 
          success: false, 
          error: 'Timezone conversion failed: unable to process date/time. Please contact your administrator.',
          details: 'The system could not convert your date/time to the proper timezone format.',
          code: 'TIMEZONE_CONVERSION_FAILED'
        });
      }
    }
    
    // Try to update with timezone fields first, fallback to basic update if columns don't exist
    let result;
    try {
      result = await query(`
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
          scheduled_timezone = COALESCE($13, scheduled_timezone),
          scheduled_at_utc = COALESCE($14, scheduled_at_utc),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
        RETURNING *
      `, [
        post_type_id, title, description, topic_keywords, suggested_date,
        processedSuggestedTime, priority, status, 
        approved_by, approved_at, generated_content_id, notes, 
        scheduledTimezone, scheduledAtUTC, id
      ]);
    } catch (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        // Check if this is specifically a timezone column error
        if (error.message.includes('scheduled_timezone') || error.message.includes('scheduled_at_utc')) {
          console.error('❌ CRITICAL: Timezone database columns missing!', {
            error: error.message,
            contentId: id,
            userId: userId,
            timestamp: new Date().toISOString(),
            attemptedFields: ['scheduled_timezone', 'scheduled_at_utc'],
            userAction: 'content_idea_update_with_timezone'
          });
          
          return res.status(500).json({ 
            success: false, 
            error: 'Timezone configuration missing: unable to save date/time. Please contact your administrator to set up timezone support.',
            details: 'The database is missing required timezone columns for proper date/time handling.',
            code: 'TIMEZONE_CONFIG_MISSING'
          });
        } else {
          // For other column errors, throw the original error
          throw error;
        }
      } else {
        throw error;
      }
    }
    
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

// Generate bulk content ideas using AI
router.post('/generate-bulk', authenticateToken, async (req, res) => {
  try {
    const { 
      project_id, 
      post_type_id, 
      count = 15, 
      focus_areas = [], 
      seasonal_themes = [],
      target_audience_insights = ''
    } = req.body;
    
    const created_by = req.user.id;
    
    // Get post type details for AI context
    const postTypeResult = await query(`
      SELECT name, purpose, tone, target_audience, ai_instructions 
      FROM post_types 
      WHERE id = $1
    `, [post_type_id]);
    
    if (postTypeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post type not found' });
    }
    
    const postType = postTypeResult.rows[0];
    
    // Generate AI ideas (simulated for now - in production, integrate with OpenAI/Claude)
    const generatedIdeas = await generateAIContentIdeas({
      postType,
      count,
      focus_areas,
      seasonal_themes,
      target_audience_insights
    });
    
    // Insert all generated ideas into database
    const insertedIdeas = [];
    for (const idea of generatedIdeas) {
      const result = await query(`
        INSERT INTO content_ideas (
          project_id, post_type_id, title, description, topic_keywords,
          suggested_date, suggested_time, priority, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        project_id, post_type_id, idea.title, idea.description, idea.topic_keywords,
        idea.suggested_date, idea.suggested_time, idea.priority, idea.notes, created_by
      ]);
      
      insertedIdeas.push(result.rows[0]);
    }
    
    res.status(201).json({ 
      success: true, 
      data: insertedIdeas,
      message: `Successfully generated ${insertedIdeas.length} content ideas`
    });
  } catch (error) {
    console.error('Error generating bulk content ideas:', error);
    res.status(500).json({ success: false, error: 'Failed to generate content ideas' });
  }
});

// Remove duplicate POST endpoint - using PUT instead

// DELETE /api/content-ideas/:id - Delete a content idea
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log(`🗑️ Deleting content idea ${id} for user ${userId}`);

    // Verify the content idea exists and user has access
    const contentCheck = await query(
      `SELECT ci.id, p.id as project_id 
       FROM content_ideas ci
       JOIN projects p ON ci.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       JOIN user_organizations uo ON c.organization_id = uo.organization_id
       WHERE ci.id = $1 AND uo.user_id = $2`,
      [id, userId]
    );

    if (contentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content idea not found or access denied'
      });
    }

    // Delete the content idea
    await query('DELETE FROM content_ideas WHERE id = $1', [id]);

    console.log(`✅ Content idea ${id} deleted successfully`);
    res.json({
      success: true,
      message: 'Content idea deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting content idea:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete content idea'
    });
  }
});

// Approve content idea
router.put('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Approving content idea ${id} by user ${userId}`);

    // Check if user has access to this content idea
    // Simplified authorization - just check if content idea exists and user is authenticated
    const contentCheck = await query(`
      SELECT ci.* FROM content_ideas ci
      WHERE ci.id = $1`,
      [id]
    );

    if (contentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content idea not found or access denied'
      });
    }

    // Update the content idea status to approved
    const result = await query(`
      UPDATE content_ideas 
      SET status = 'approved', 
          approved_by = $1, 
          approved_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [userId, id]
    );

    console.log(`✅ Content idea ${id} approved successfully`);
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Content idea approved successfully'
    });

  } catch (error) {
    console.error('❌ Error approving content idea:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve content idea'
    });
  }
});

module.exports = router;
