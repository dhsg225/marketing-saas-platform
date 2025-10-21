const { query } = require('../database/config');

async function addTimezoneColumns() {
  try {
    console.log('🕐 Adding timezone columns...');
    
    // Add timezone columns to content_ideas table
    try {
      await query(`ALTER TABLE content_ideas ADD COLUMN scheduled_timezone VARCHAR(50) DEFAULT 'Asia/Bangkok'`);
      console.log('✅ Added scheduled_timezone to content_ideas');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ scheduled_timezone already exists in content_ideas');
      } else {
        console.error('❌ Error adding scheduled_timezone:', error.message);
      }
    }
    
    try {
      await query(`ALTER TABLE content_ideas ADD COLUMN scheduled_at_utc TIMESTAMP WITH TIME ZONE`);
      console.log('✅ Added scheduled_at_utc to content_ideas');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ scheduled_at_utc already exists in content_ideas');
      } else {
        console.error('❌ Error adding scheduled_at_utc:', error.message);
      }
    }
    
    console.log('✅ Timezone columns added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add timezone columns:', error);
  }
}

addTimezoneColumns();
