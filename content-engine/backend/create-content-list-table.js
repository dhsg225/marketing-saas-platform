const { query } = require('../database/config');

async function createContentListTable() {
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
    
    console.log('🎉 Content List table setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating content list table:', error);
  }
  
  process.exit(0);
}

createContentListTable();
