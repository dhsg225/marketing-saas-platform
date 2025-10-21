const express = require('express');
const router = express.Router();
const { query } = require('../../database/config');
const fs = require('fs');
const path = require('path');
const { applyImagePromptMigration } = require('../../database/apply_image_prompt_migration');
const { applyWorkflowMigration } = require('../../database/apply_workflow_migration');
const { applyPostsMigration } = require('../../database/apply_posts_migration');
const { applySchedulingMigration } = require('../../database/apply_scheduling_migration');
const { applyTimezoneMigration } = require('../../database/apply_timezone_migration');

// Setup endpoint to create content_list_items table
router.post('/create-content-list-table', async (req, res) => {
  try {
    console.log('🔍 Creating content_list_items table...');
    
    // Create the table
    await query(`
      CREATE TABLE IF NOT EXISTS content_list_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        
        -- Basic content information
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('post', 'video', 'ad', 'blog', 'email', 'story', 'reel')),
        
        -- Workflow stage
        stage VARCHAR(50) NOT NULL DEFAULT 'ideas' CHECK (stage IN (
          'ideas',           -- Unformed concepts, no assets yet
          'in_progress',     -- Actively being written or designed
          'assets_attached', -- Images or videos now linked
          'ready_to_publish', -- Finalized content
          'published'        -- Optional completed section
        )),
        
        -- Assignment and ownership
        assigned_user_id UUID REFERENCES users(id),
        created_by UUID NOT NULL REFERENCES users(id),
        
        -- Content details
        content_text TEXT, -- The actual content when generated
        media_attachments JSONB DEFAULT '[]', -- Array of media file references
        metadata JSONB DEFAULT '{}', -- Additional content metadata
        
        -- Status tracking
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        due_date DATE,
        completed_at TIMESTAMP,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Order within stage (for drag-and-drop positioning)
        stage_order INTEGER DEFAULT 0
      )
    `);
    
    console.log('✅ Table created successfully');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_project_id ON content_list_items(project_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_stage ON content_list_items(stage)');
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_assigned_user ON content_list_items(assigned_user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_created_by ON content_list_items(created_by)');
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_content_type ON content_list_items(content_type)');
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_priority ON content_list_items(priority)');
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_due_date ON content_list_items(due_date)');
    await query('CREATE INDEX IF NOT EXISTS idx_content_list_items_stage_order ON content_list_items(stage, stage_order)');
    
    console.log('✅ Indexes created successfully');
    
    // Create trigger function
    console.log('🔍 Creating trigger function...');
    
    await query(`
      CREATE OR REPLACE FUNCTION update_content_list_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    // Create trigger
    await query(`
      CREATE TRIGGER trigger_content_list_items_updated_at
          BEFORE UPDATE ON content_list_items
          FOR EACH ROW
          EXECUTE FUNCTION update_content_list_items_updated_at()
    `);
    
    console.log('✅ Trigger created successfully');
    
    res.json({
      success: true,
      message: 'Content List table setup completed successfully!'
    });
    
  } catch (error) {
    console.error('❌ Error creating content list table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup endpoint to create post creation system tables
router.post('/create-post-creation-tables', async (req, res) => {
  try {
    console.log('🔍 Creating post creation system tables...');
    
    // Create posts table first
    await query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        created_by UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        creation_mode VARCHAR(20) NOT NULL CHECK (creation_mode IN ('all_at_once', 'by_parts')),
        platform VARCHAR(50),
        post_type_id UUID,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'published', 'cancelled')),
        scheduled_date DATE,
        scheduled_time TIME,
        published_at TIMESTAMP,
        full_content TEXT,
        full_visual_url TEXT,
        full_visual_alt_text TEXT,
        tags TEXT[],
        hashtags TEXT[],
        mentions TEXT[],
        engagement_metrics JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create post_sections table
    await query(`
      CREATE TABLE IF NOT EXISTS post_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL,
        section_type VARCHAR(30) NOT NULL CHECK (section_type IN ('tease_hook', 'body_content', 'cta', 'signature_block')),
        section_order INTEGER NOT NULL DEFAULT 1,
        content TEXT NOT NULL,
        visual_url TEXT,
        visual_alt_text TEXT,
        ai_generated BOOLEAN DEFAULT FALSE,
        ai_model VARCHAR(50),
        ai_prompt TEXT,
        ai_confidence DECIMAL(3,2),
        is_locked BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT FALSE,
        word_count INTEGER DEFAULT 0,
        character_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, section_type)
      )
    `);

    // Create post_generation_history table
    await query(`
      CREATE TABLE IF NOT EXISTS post_generation_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL,
        section_id UUID,
        generation_type VARCHAR(30) NOT NULL CHECK (generation_type IN ('full_post', 'section_content', 'visual', 'optimization')),
        ai_model VARCHAR(50) NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        tokens_used INTEGER,
        generation_time_ms INTEGER,
        confidence_score DECIMAL(3,2),
        user_approved BOOLEAN DEFAULT FALSE,
        user_modified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Post creation system tables created successfully!');
    
    res.json({
      success: true,
      message: 'Post creation system tables created successfully',
      tables: ['posts', 'post_sections', 'post_generation_history']
    });

  } catch (error) {
    console.error('❌ Error creating post creation tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup endpoint to add image_prompt field to posts and content_ideas tables
router.post('/add-image-prompt-field', async (req, res) => {
  try {
    console.log('🖼️  Adding image_prompt field to posts and content_ideas tables...');
    
    await applyImagePromptMigration();
    
    res.json({
      success: true,
      message: 'Image prompt field added successfully to posts and content_ideas tables',
      tables: ['posts', 'content_ideas']
    });

  } catch (error) {
    console.error('❌ Error adding image_prompt field:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup endpoint to update content workflow for two-stage approval
router.post('/update-content-workflow', async (req, res) => {
  try {
    console.log('🔄 Updating content workflow for two-stage approval...');

    await applyWorkflowMigration(); // Call the migration function

    res.json({
      success: true,
      message: 'Content workflow updated successfully for two-stage approval process',
      changes: [
        'Added concept_approved_at and concept_approved_by fields',
        'Added publish_approved_at and publish_approved_by fields',
        'Updated existing approved status to concept_approved'
      ]
    });

  } catch (error) {
    console.error('❌ Error updating content workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup endpoint to create posts table
router.post('/create-posts-table', async (req, res) => {
  try {
    console.log('🔍 Creating posts table...');
    
    // First, check if posts table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'posts'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('📋 Posts table already exists, adding missing columns...');
      
      // Add missing columns if they don't exist
      const columnsToAdd = [
        { name: 'concept_id', type: 'VARCHAR(255)' },
        { name: 'version', type: 'INTEGER DEFAULT 1' },
        { name: 'image_prompt', type: 'TEXT' },
        { name: 'generated_image', type: 'TEXT' }
      ];
      
      for (const column of columnsToAdd) {
        try {
          await query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
          console.log(`✅ Added column: ${column.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Column ${column.name} already exists`);
          } else {
            throw error;
          }
        }
      }
    } else {
      console.log('📋 Creating new posts table...');
      
      // Create the posts table
      await query(`
        CREATE TABLE posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          concept_id VARCHAR(255), -- Links to content_ideas.id
          
          -- Basic post information
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          content_type VARCHAR(50) NOT NULL DEFAULT 'social_media_post',
          
          -- Post status and workflow
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
            'draft', 'ready_to_publish', 'published', 'archived'
          )),
          
          -- Version control
          version INTEGER DEFAULT 1,
          
          -- Image generation
          image_prompt TEXT,
          generated_image TEXT,
          
          -- Post type and metadata
          post_type_id UUID,
          metadata JSONB DEFAULT '{}',
          
          -- Ownership and timestamps
          created_by UUID NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_posts_project_id ON posts(project_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_posts_concept_id ON posts(concept_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_posts_created_by ON posts(created_by)');

    console.log('✅ Posts table setup completed successfully');

    res.json({
      success: true,
      message: 'Posts table setup completed successfully',
      table: 'posts'
    });

  } catch (error) {
    console.error('❌ Error setting up posts table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup endpoint to add posts table fields for inline editor
router.post('/add-posts-fields', async (req, res) => {
  try {
    console.log('🔄 Adding posts table fields for inline editor...');

    await applyPostsMigration(); // Call the migration function

    res.json({
      success: true,
      message: 'Posts table fields added successfully for inline content editor',
      changes: [
        'Added concept_id field to link posts to concepts',
        'Added version field for content versioning',
        'Added image_prompt field for AI image generation',
        'Added generated_image field for storing image URLs'
      ]
    });

  } catch (error) {
    console.error('❌ Error adding posts fields:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Temporary endpoint to check posts table structure
router.get('/check-posts-table', async (req, res) => {
  try {
    const result = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      columns: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Temporary endpoint to check constraint
router.post('/check-constraint', async (req, res) => {
  try {
    const { table, column } = req.body;
    const result = await query(`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = $1)
      AND conname LIKE '%${column}%'
    `, [table]);
    
    res.json({
      success: true,
      constraints: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Temporary endpoint to fix posts table
router.post('/fix-posts-table', async (req, res) => {
  try {
    console.log('🔧 Fixing posts table structure...');
    
    // Add missing columns one by one
    const columnsToAdd = [
      { name: 'content', type: 'TEXT NOT NULL DEFAULT \'\'' },
      { name: 'concept_id', type: 'VARCHAR(255)' },
      { name: 'version', type: 'INTEGER DEFAULT 1' },
      { name: 'image_prompt', type: 'TEXT' },
      { name: 'generated_image', type: 'TEXT' },
      { name: 'attached_asset_id', type: 'UUID' },
      { name: 'attached_asset_url', type: 'TEXT' }
    ];

    for (const column of columnsToAdd) {
      try {
        await query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Column ${column.name} already exists`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Posts table structure fixed'
    });
  } catch (error) {
    console.error('❌ Error fixing posts table:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Temporary endpoint to fix posts status constraint
router.post('/fix-posts-status-constraint', async (req, res) => {
  try {
    console.log('🔧 Fixing posts status constraint...');

    // Drop the old constraint if it exists
    try {
      await query('ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check');
      console.log('✅ Dropped old posts_status_check constraint');
    } catch (error) {
      console.log('⚠️  Constraint might not exist:', error.message);
    }

    // Add the correct constraint
    await query(`
      ALTER TABLE posts 
      ADD CONSTRAINT posts_status_check 
      CHECK (status IN ('draft', 'ready_to_publish', 'published', 'archived'))
    `);
    console.log('✅ Added correct posts_status_check constraint');

    res.json({
      success: true,
      message: 'Posts status constraint fixed'
    });
  } catch (error) {
    console.error('❌ Error fixing status constraint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Temporary endpoint to fix content_ideas status constraint
router.post('/fix-content-ideas-status-constraint', async (req, res) => {
  try {
    console.log('🔧 Fixing content_ideas status constraint...');

    // Drop the old constraint if it exists
    try {
      await query('ALTER TABLE content_ideas DROP CONSTRAINT IF EXISTS content_ideas_status_check');
      console.log('✅ Dropped old content_ideas_status_check constraint');
    } catch (error) {
      console.log('⚠️  Constraint might not exist:', error.message);
    }

    // Update existing status values to match new workflow
    console.log('📝 Updating existing status values...');
    
    // Map old statuses to new ones
    await query(`UPDATE content_ideas SET status = 'concept_approved' WHERE status = 'approved'`);
    await query(`UPDATE content_ideas SET status = 'published' WHERE status = 'completed'`);
    await query(`UPDATE content_ideas SET status = 'in_development' WHERE status = 'in_progress'`);
    await query(`UPDATE content_ideas SET status = 'draft' WHERE status = 'scheduled'`);
    
    console.log('✅ Updated existing status values');

    // Add the correct constraint with new two-stage workflow statuses
    await query(`
      ALTER TABLE content_ideas 
      ADD CONSTRAINT content_ideas_status_check 
      CHECK (status IN ('draft', 'concept_approved', 'in_development', 'ready_to_publish', 'published', 'cancelled'))
    `);
    console.log('✅ Added correct content_ideas_status_check constraint');

    res.json({
      success: true,
      message: 'Content ideas status constraint fixed and data migrated'
    });
  } catch (error) {
    console.error('❌ Error fixing content ideas status constraint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup endpoint to add scheduling fields to posts table
router.post('/add-scheduling-fields', async (req, res) => {
  try {
    console.log('📅 Adding scheduling fields to posts table...');
    
    await applySchedulingMigration();

    res.json({
      success: true,
      message: 'Scheduling fields added successfully to posts table',
      changes: [
        'Added scheduled_date field for publication date',
        'Added scheduled_time field for publication time',
        'Added timezone field (default: Asia/Bangkok)',
        'Added platform field (default: instagram)',
        'Added auto_publish boolean field',
        'Added published_at timestamp field'
      ]
    });
  } catch (error) {
    console.error('❌ Error adding scheduling fields:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup endpoint to add timezone management system
router.post('/add-timezone-management', async (req, res) => {
  try {
    console.log('🕐 Adding timezone management system...');
    
    await applyTimezoneMigration();

    res.json({
      success: true,
      message: 'Timezone management system added successfully',
      changes: [
        'Added timezone preferences to users and clients tables',
        'Created system_settings table for global timezone configuration',
        'Added timezone tracking to content_ideas and posts tables',
        'Created timezone_conversions log table for debugging',
        'Added timezone conversion utilities and indexes'
      ]
    });
  } catch (error) {
    console.error('❌ Error adding timezone management:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update 2023 dates to 2025
router.post('/update-2023-dates', async (req, res) => {
  try {
    console.log('🔄 Updating 2023 scheduled dates to 2025...');
    
    // Find all content ideas with 2023 scheduled dates
    const findQuery = `
      SELECT id, title, suggested_date 
      FROM content_ideas 
      WHERE suggested_date < '2025-01-01' 
      AND suggested_date IS NOT NULL
    `;
    
    const result = await query(findQuery);
    console.log(`Found ${result.rows.length} items with 2023 dates:`);
    
    result.rows.forEach(row => {
      console.log(`- ${row.title}: ${row.suggested_date}`);
    });
    
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'No 2023 dates found to update', updated: 0 });
    }
    
    // Update all 2023 dates to 2025 (keeping the same month and day)
    const updateQuery = `
      UPDATE content_ideas 
      SET suggested_date = suggested_date + INTERVAL '2 years'
      WHERE suggested_date < '2025-01-01' 
      AND suggested_date IS NOT NULL
    `;
    
    const updateResult = await query(updateQuery);
    console.log(`✅ Updated ${updateResult.rowCount} items to 2025 dates`);
    
    res.json({ 
      success: true, 
      message: `Updated ${updateResult.rowCount} items to 2025 dates`,
      updated: updateResult.rowCount
    });
    
  } catch (error) {
    console.error('❌ Error updating dates:', error);
    res.status(500).json({ success: false, error: 'Failed to update dates' });
  }
});

// Add timezone management system
router.post('/add-timezone-management', async (req, res) => {
  try {
    console.log('🕐 Starting timezone management migration...');
    
    const result = await applyTimezoneMigration();
    
    res.json({ 
      success: true, 
      message: 'Timezone management system added successfully',
      result: result
    });
    
  } catch (error) {
    console.error('❌ Timezone migration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
