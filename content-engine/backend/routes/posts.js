// [2025-10-19] - Post Creation System API Routes
// Supports both All-at-Once and By-Parts creation modes

const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const { authenticateToken } = require('../middleware/auth');

// Get all posts for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { mode, status, limit = 20, offset = 0 } = req.query;

    console.log('🔍 Fetching posts for project:', projectId);

    // Verify project access
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Build query with filters
    let postsQuery = `
      SELECT 
        p.*,
        pt.name as post_type_name,
        pt.color as post_type_color,
        u.name as created_by_name,
        COUNT(ps.id) as section_count
      FROM posts p
      LEFT JOIN post_types pt ON p.post_type_id = pt.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN post_sections ps ON p.id = ps.post_id
      WHERE p.project_id = $1
    `;

    const queryParams = [projectId];
    let paramCount = 1;

    if (mode) {
      paramCount++;
      postsQuery += ` AND p.creation_mode = $${paramCount}`;
      queryParams.push(mode);
    }

    if (status) {
      paramCount++;
      postsQuery += ` AND p.status = $${paramCount}`;
      queryParams.push(status);
    }

    postsQuery += `
      GROUP BY p.id, pt.name, pt.color, u.name
      ORDER BY p.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(postsQuery, queryParams);

    // Get sections for each post (if By-Parts mode)
    const postsWithSections = await Promise.all(
      result.rows.map(async (post) => {
        if (post.creation_mode === 'by_parts') {
          const sectionsResult = await query(
            `SELECT * FROM post_sections 
             WHERE post_id = $1 
             ORDER BY section_order ASC`,
            [post.id]
          );
          post.sections = sectionsResult.rows;
        }
        return post;
      })
    );

    res.json({
      success: true,
      data: postsWithSections,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts'
    });
  }
});

// Create a new post (All-at-Once mode)
router.post('/create/all-at-once', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      project_id,
      title,
      description,
      platform,
      post_type_id,
      priority = 'medium',
      full_content,
      full_visual_url,
      full_visual_alt_text,
      image_prompt,
      tags = [],
      hashtags = [],
      mentions = [],
      scheduled_date,
      scheduled_time
    } = req.body;

    console.log('🚀 Creating All-at-Once post:', { title, project_id });

    // Verify project access
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Create the post
    const postResult = await query(
      `INSERT INTO posts (
        project_id, created_by, title, description, creation_mode,
        platform, post_type_id, priority, full_content, 
        full_visual_url, full_visual_alt_text, image_prompt, tags, hashtags, mentions,
        scheduled_date, scheduled_time
      ) VALUES ($1, $2, $3, $4, 'all_at_once', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        project_id, userId, title, description, platform, post_type_id, priority,
        full_content, full_visual_url, full_visual_alt_text, image_prompt, tags, hashtags, mentions,
        scheduled_date, scheduled_time
      ]
    );

    const newPost = postResult.rows[0];

    // Log generation history
    await query(
      `INSERT INTO post_generation_history (
        post_id, generation_type, ai_model, prompt, response, user_approved
      ) VALUES ($1, 'full_post', 'user_created', 'Manual creation', $2, true)`,
      [newPost.id, full_content]
    );

    res.json({
      success: true,
      data: newPost,
      message: 'Post created successfully in All-at-Once mode'
    });

  } catch (error) {
    console.error('❌ Error creating All-at-Once post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post'
    });
  }
});

// Create a new post (By-Parts mode)
router.post('/create/by-parts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      project_id,
      title,
      description,
      platform,
      post_type_id,
      priority = 'medium',
      sections = [],
      image_prompt,
      tags = [],
      hashtags = [],
      mentions = [],
      scheduled_date,
      scheduled_time
    } = req.body;

    console.log('🚀 Creating By-Parts post:', { title, project_id, sections: sections.length });

    // Verify project access
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Validate sections
    const validSectionTypes = ['tease_hook', 'body_content', 'cta', 'signature_block'];
    const providedTypes = sections.map(s => s.section_type);
    const hasAllRequired = validSectionTypes.every(type => providedTypes.includes(type));

    if (!hasAllRequired) {
      return res.status(400).json({
        success: false,
        error: 'By-Parts mode requires all section types: tease_hook, body_content, cta, signature_block'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Create the post
      const postResult = await query(
        `INSERT INTO posts (
          project_id, created_by, title, description, creation_mode,
          platform, post_type_id, priority, image_prompt, tags, hashtags, mentions,
          scheduled_date, scheduled_time
        ) VALUES ($1, $2, $3, $4, 'by_parts', $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          project_id, userId, title, description, platform, post_type_id, priority,
          image_prompt, tags, hashtags, mentions, scheduled_date, scheduled_time
        ]
      );

      const newPost = postResult.rows[0];

      // Create sections
      const createdSections = [];
      for (const section of sections) {
        const sectionResult = await query(
          `INSERT INTO post_sections (
            post_id, section_type, section_order, content, visual_url, visual_alt_text,
            ai_generated, ai_model, ai_prompt, ai_confidence, is_locked, word_count, character_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            newPost.id, section.section_type, section.section_order || 1,
            section.content, section.visual_url, section.visual_alt_text,
            section.ai_generated || false, section.ai_model, section.ai_prompt,
            section.ai_confidence, section.is_locked || false,
            section.content ? section.content.split(' ').length : 0,
            section.content ? section.content.length : 0
          ]
        );

        createdSections.push(sectionResult.rows[0]);

        // Log generation history if AI-generated
        if (section.ai_generated) {
          await query(
            `INSERT INTO post_generation_history (
              post_id, section_id, generation_type, ai_model, prompt, response, user_approved
            ) VALUES ($1, $2, 'section_content', $3, $4, $5, false)`,
            [newPost.id, sectionResult.rows[0].id, section.ai_model, section.ai_prompt, section.content]
          );
        }
      }

      await query('COMMIT');

      // Return post with sections
      const postWithSections = {
        ...newPost,
        sections: createdSections
      };

      res.json({
        success: true,
        data: postWithSections,
        message: 'Post created successfully in By-Parts mode'
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating By-Parts post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post'
    });
  }
});

// Update a post section (By-Parts mode)
router.put('/:postId/sections/:sectionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, sectionId } = req.params;
    const {
      content,
      visual_url,
      visual_alt_text,
      is_locked,
      is_approved
    } = req.body;

    console.log('✏️ Updating post section:', { postId, sectionId });

    // Verify post ownership
    const postCheck = await query(
      'SELECT id FROM posts WHERE id = $1 AND created_by = $2',
      [postId, userId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found or access denied'
      });
    }

    // Update section
    const updateResult = await query(
      `UPDATE post_sections 
       SET content = COALESCE($1, content),
           visual_url = COALESCE($2, visual_url),
           visual_alt_text = COALESCE($3, visual_alt_text),
           is_locked = COALESCE($4, is_locked),
           is_approved = COALESCE($5, is_approved),
           word_count = CASE WHEN $1 IS NOT NULL THEN array_length(string_to_array($1, ' '), 1) ELSE word_count END,
           character_count = CASE WHEN $1 IS NOT NULL THEN length($1) ELSE character_count END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND post_id = $7
       RETURNING *`,
      [content, visual_url, visual_alt_text, is_locked, is_approved, sectionId, postId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Section updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update section'
    });
  }
});

// Generate AI content for a section
router.post('/:postId/sections/:sectionId/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId, sectionId } = req.params;
    const {
      prompt,
      ai_model = 'claude',
      section_type,
      preserve_existing = false
    } = req.body;

    console.log('🤖 Generating AI content for section:', { postId, sectionId, section_type });

    // Verify post ownership
    const postCheck = await query(
      'SELECT id FROM posts WHERE id = $1 AND created_by = $2',
      [postId, userId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found or access denied'
      });
    }

    // Check if section is locked
    const sectionCheck = await query(
      'SELECT is_locked FROM post_sections WHERE id = $1 AND post_id = $2',
      [sectionId, postId]
    );

    if (sectionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Section not found'
      });
    }

    if (sectionCheck.rows[0].is_locked) {
      return res.status(400).json({
        success: false,
        error: 'Section is locked and cannot be modified by AI'
      });
    }

    // TODO: Integrate with AI service (Claude, GPT, etc.)
    // For now, return a placeholder response
    const aiResponse = `AI-generated content for ${section_type}: ${prompt}`;
    const confidence = 0.85;

    // Update section with AI-generated content
    const updateResult = await query(
      `UPDATE post_sections 
       SET content = $1,
           ai_generated = true,
           ai_model = $2,
           ai_prompt = $3,
           ai_confidence = $4,
           word_count = array_length(string_to_array($1, ' '), 1),
           character_count = length($1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND post_id = $6
       RETURNING *`,
      [aiResponse, ai_model, prompt, confidence, sectionId, postId]
    );

    // Log generation history
    await query(
      `INSERT INTO post_generation_history (
        post_id, section_id, generation_type, ai_model, prompt, response, confidence_score, user_approved
      ) VALUES ($1, $2, 'section_content', $3, $4, $5, $6, false)`,
      [postId, sectionId, ai_model, prompt, aiResponse, confidence]
    );

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: 'AI content generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating AI content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI content'
    });
  }
});

// Get post by ID with sections
router.get('/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    console.log('🔍 Fetching post:', postId);

    // Get post details
    const postResult = await query(
      `SELECT 
        p.*,
        pt.name as post_type_name,
        pt.color as post_type_color,
        u.name as created_by_name
      FROM posts p
      LEFT JOIN post_types pt ON p.post_type_id = pt.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    const post = postResult.rows[0];

    // Get sections if By-Parts mode
    if (post.creation_mode === 'by_parts') {
      const sectionsResult = await query(
        `SELECT * FROM post_sections 
         WHERE post_id = $1 
         ORDER BY section_order ASC`,
        [postId]
      );
      post.sections = sectionsResult.rows;
    }

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error('❌ Error fetching post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post'
    });
  }
});

// Delete a post
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { postId } = req.params;

    console.log('🗑️ Deleting post:', postId);

    // Verify ownership
    const postCheck = await query(
      'SELECT id FROM posts WHERE id = $1 AND created_by = $2',
      [postId, userId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found or access denied'
      });
    }

    // Delete post (cascades to sections and history)
    await query('DELETE FROM posts WHERE id = $1', [postId]);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post'
    });
  }
});

// Get saved image prompts for reuse
router.get('/image-prompts/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;

    console.log('🖼️  Fetching saved image prompts for project:', projectId);

    // Verify project access
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get saved image prompts from posts only
    const promptsResult = await query(`
      SELECT 
        'post' as source_type,
        p.id as source_id,
        p.title,
        p.image_prompt,
        p.created_at,
        p.updated_at
      FROM posts p
      WHERE p.project_id = $1 
        AND p.image_prompt IS NOT NULL 
        AND p.image_prompt != ''
      ORDER BY p.updated_at DESC
      LIMIT $2
    `, [projectId, limit]);

    const prompts = promptsResult.rows.map(row => ({
      id: `${row.source_type}_${row.source_id}`,
      sourceType: row.source_type,
      sourceId: row.source_id,
      title: row.title,
      prompt: row.image_prompt,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      success: true,
      data: prompts,
      count: prompts.length
    });

  } catch (error) {
    console.error('❌ Error fetching image prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch image prompts'
    });
  }
});

// Save draft content from inline editor
router.post('/save-draft', authenticateToken, async (req, res) => {
  try {
    const {
      concept_id,
      project_id,
      title,
      content,
      content_type,
      status = 'draft',
      version = 1,
      image_prompt,
      generated_image,
      attached_asset_id,
      attached_asset_url,
      scheduled_date,
      scheduled_time,
      timezone = 'Asia/Bangkok',
      platform = 'instagram',
      auto_publish = false
    } = req.body;

    console.log('💾 Saving draft content:', { concept_id, project_id, title, status });
    console.log('📅 Scheduling data:', { scheduled_date, scheduled_time, timezone, platform, auto_publish });
    console.log('🔍 Full request body:', JSON.stringify(req.body, null, 2));

    // Verify project access
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if a draft already exists for this concept
    let postId;
    if (concept_id) {
      const existingDraft = await query(
        'SELECT id FROM posts WHERE concept_id = $1 ORDER BY created_at DESC LIMIT 1',
        [concept_id]
      );

      if (existingDraft.rows.length > 0) {
        // Update existing draft
        postId = existingDraft.rows[0].id;
        const updateQuery = `
          UPDATE posts SET
            title = $1,
            full_content = $2,
            status = $3,
            image_prompt = $4,
            generated_image = $5,
            attached_asset_id = $6,
            attached_asset_url = $7,
            scheduled_date = $8,
            scheduled_time = $9,
            timezone = $10,
            platform = $11,
            auto_publish = $12,
            updated_at = NOW()
          WHERE id = $13
          RETURNING id
        `;

        await query(updateQuery, [
          title,
          content,
          status,
          image_prompt,
          generated_image,
          attached_asset_id,
          attached_asset_url,
          scheduled_date,
          scheduled_time,
          timezone,
          platform,
          auto_publish,
          postId
        ]);

        console.log('✅ Draft updated successfully:', postId);
      } else {
        // Insert new draft
        const insertQuery = `
          INSERT INTO posts (
            project_id,
            concept_id,
            title,
            full_content,
            creation_mode,
            status,
            version,
            image_prompt,
            generated_image,
            attached_asset_id,
            attached_asset_url,
            scheduled_date,
            scheduled_time,
            timezone,
            platform,
            auto_publish,
            created_by,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
          RETURNING id
        `;

        const result = await query(insertQuery, [
          project_id,
          concept_id,
          title,
          content,
          'by_parts',
          status,
          version,
          image_prompt,
          generated_image,
          attached_asset_id,
          attached_asset_url,
          scheduled_date,
          scheduled_time,
          timezone,
          platform,
          auto_publish,
          req.user.userId
        ]);

        postId = result.rows[0].id;
        console.log('✅ Draft created successfully:', postId);
      }
    } else {
      // No concept_id, just insert
      const insertQuery = `
        INSERT INTO posts (
          project_id,
          concept_id,
          title,
          full_content,
          creation_mode,
          status,
          version,
          image_prompt,
          generated_image,
          attached_asset_id,
          attached_asset_url,
          scheduled_date,
          scheduled_time,
          timezone,
          platform,
          auto_publish,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING id
      `;

      const result = await query(insertQuery, [
        project_id,
        concept_id,
        title,
        content,
        'by_parts',
        status,
        version,
        image_prompt,
        generated_image,
        attached_asset_id,
        attached_asset_url,
        scheduled_date,
        scheduled_time,
        timezone,
        platform,
        auto_publish,
        req.user.userId
      ]);

      postId = result.rows[0].id;
      console.log('✅ Draft saved successfully:', postId);
    }

    // Update the concept status if it's being moved to ready_to_publish
    if (status === 'ready_to_publish' && concept_id) {
      await query(
        'UPDATE content_ideas SET status = $1, updated_at = NOW() WHERE id = $2',
        ['ready_to_publish', concept_id]
      );
    }

    res.json({
      success: true,
      id: postId,
      message: 'Draft saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft'
    });
  }
});

// Get draft by concept_id
router.get('/draft-by-concept/:conceptId', authenticateToken, async (req, res) => {
  try {
    const { conceptId } = req.params;

    console.log('📖 Fetching draft for concept:', conceptId);

    // Get the most recent draft for this concept
    const draftQuery = `
      SELECT 
        p.id,
        p.concept_id,
        p.project_id,
        p.title,
        p.full_content,
        p.status,
        p.version,
        p.image_prompt,
        p.generated_image,
        p.attached_asset_id,
        p.attached_asset_url,
        p.created_at,
        p.updated_at,
        a.url as asset_url,
        a.file_name as asset_file_name,
        a.tags as asset_tags
      FROM posts p
      LEFT JOIN assets a ON p.attached_asset_id = a.id
      WHERE p.concept_id = $1
      ORDER BY p.updated_at DESC
      LIMIT 1
    `;

    const result = await query(draftQuery, [conceptId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        draft: null,
        message: 'No draft found for this concept'
      });
    }

    const draft = result.rows[0];

    console.log('✅ Draft found:', draft.id);

    res.json({
      success: true,
      draft: {
        id: draft.id,
        concept_id: draft.concept_id,
        project_id: draft.project_id,
        title: draft.title,
        content: draft.full_content,
        status: draft.status,
        version: draft.version,
        image_prompt: draft.image_prompt,
        generated_image: draft.generated_image,
        attached_asset_id: draft.attached_asset_id,
        attached_asset_url: draft.attached_asset_url || draft.asset_url,
        asset_file_name: draft.asset_file_name,
        asset_tags: draft.asset_tags,
        created_at: draft.created_at,
        updated_at: draft.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error fetching draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch draft'
    });
  }
});

// Get scheduled posts by project
router.get('/scheduled/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log('📅 Fetching scheduled posts for project:', projectId);

    // Get all posts with scheduled dates for this project
    const scheduledQuery = `
      SELECT 
        p.id,
        p.concept_id,
        p.project_id,
        p.title,
        p.full_content,
        p.status,
        p.scheduled_date,
        p.scheduled_time,
        p.timezone,
        p.platform,
        p.auto_publish,
        p.image_prompt,
        p.generated_image,
        p.attached_asset_id,
        p.attached_asset_url,
        p.created_at,
        p.updated_at,
        a.url as asset_url,
        a.file_name as asset_file_name,
        ci.post_type_id,
        pt.name as post_type_name,
        pt.color as post_type_color
      FROM posts p
      LEFT JOIN assets a ON (p.attached_asset_id IS NOT NULL AND p.attached_asset_id::text = a.id::text)
      LEFT JOIN content_ideas ci ON (p.concept_id IS NOT NULL AND p.concept_id::text = ci.id::text)
      LEFT JOIN post_types pt ON (ci.post_type_id IS NOT NULL AND ci.post_type_id::text = pt.id::text)
      WHERE p.project_id::text = $1
        AND p.scheduled_date IS NOT NULL
        AND p.status IN ('draft', 'ready_to_publish')
      ORDER BY p.scheduled_date ASC, p.scheduled_time ASC
    `;

    const result = await query(scheduledQuery, [projectId]);

    console.log(`✅ Found ${result.rows.length} scheduled posts`);

    const scheduledPosts = result.rows.map(post => ({
      id: post.id,
      concept_id: post.concept_id,
      project_id: post.project_id,
      title: post.title,
      content: post.full_content,
      status: post.status,
      scheduled_date: post.scheduled_date,
      scheduled_time: post.scheduled_time,
      timezone: post.timezone,
      platform: post.platform,
      auto_publish: post.auto_publish,
      image_prompt: post.image_prompt,
      generated_image: post.generated_image,
      attached_asset_id: post.attached_asset_id,
      attached_asset_url: post.attached_asset_url || post.asset_url,
      asset_file_name: post.asset_file_name,
      post_type_name: post.post_type_name,
      post_type_color: post.post_type_color,
      created_at: post.created_at,
      updated_at: post.updated_at
    }));

    res.json({
      success: true,
      data: scheduledPosts,
      count: scheduledPosts.length
    });

  } catch (error) {
    console.error('❌ Error fetching scheduled posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled posts'
    });
  }
});

module.exports = router;
