const { query } = require('./config');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

async function createUserActivitiesTable() {
  try {
    console.log('🔧 Creating user_activities table...');
    
    // Create user_activities table
    await query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        action_description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created user_activities table');

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_activities_action_type ON user_activities(action_type)
    `);
    console.log('✅ Created indexes');

    // Get first user ID
    const userResult = await query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('⚠️ No users found, skipping sample data');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('👤 Using user ID:', userId);

    // Insert sample activities
    const sampleActivities = [
      {
        action_type: 'generate_content',
        action_description: 'Generated content ideas for social media campaign',
        metadata: JSON.stringify({ content_count: 5, platform: 'Instagram' })
      },
      {
        action_type: 'upload_document',
        action_description: 'Uploaded and processed client reference document',
        metadata: JSON.stringify({ document_type: 'Content Calendar', ai_processed: true })
      },
      {
        action_type: 'view_analytics',
        action_description: 'Viewed content performance analytics',
        metadata: JSON.stringify({ date_range: 'last_30_days' })
      },
      {
        action_type: 'schedule_post',
        action_description: 'Scheduled Instagram post for tomorrow',
        metadata: JSON.stringify({ platform: 'Instagram', scheduled_date: '2024-10-18' })
      },
      {
        action_type: 'manage_projects',
        action_description: 'Updated project settings',
        metadata: JSON.stringify({ project_name: 'Matts Place' })
      },
      {
        action_type: 'talent_marketplace',
        action_description: 'Browsed talent marketplace',
        metadata: JSON.stringify({ search_term: 'photographer' })
      },
      {
        action_type: 'client_collaboration',
        action_description: 'Sent feedback to client',
        metadata: JSON.stringify({ client_name: 'Matt' })
      },
      {
        action_type: 'settings',
        action_description: 'Updated user preferences',
        metadata: JSON.stringify({ section: 'profile' })
      }
    ];

    for (const activity of sampleActivities) {
      await query(`
        INSERT INTO user_activities (user_id, action_type, action_description, metadata, created_at)
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 24)} hours')
        ON CONFLICT DO NOTHING
      `, [userId, activity.action_type, activity.action_description, activity.metadata]);
    }
    
    console.log('✅ Inserted sample activities');

    // Verify the data
    const countResult = await query('SELECT COUNT(*) FROM user_activities WHERE user_id = $1', [userId]);
    console.log(`📊 Total activities for user: ${countResult.rows[0].count}`);

    console.log('🎉 User activities table created successfully!');
  } catch (error) {
    console.error('❌ Error creating user activities table:', error);
    throw error;
  }
}

createUserActivitiesTable()
  .then(() => console.log('✅ Script completed successfully'))
  .catch((err) => console.error('❌ Script failed:', err));
