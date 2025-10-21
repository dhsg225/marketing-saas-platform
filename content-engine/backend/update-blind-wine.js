const { query } = require('../database/config');

async function updateBlindWineDate() {
  try {
    console.log('🔍 Looking for Blind Wine Tasting content...');
    
    // Find the Blind Wine Tasting content
    const result = await query(
      'SELECT id, title, suggested_date, suggested_time FROM content_ideas WHERE title ILIKE $1', 
      ['%blind wine%']
    );
    
    console.log('Found content ideas:', JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length > 0) {
      const contentId = result.rows[0].id;
      console.log('📝 Updating content idea ID:', contentId);
      
      // Update the suggested_date to November 7th, 2025
      const updateResult = await query(
        'UPDATE content_ideas SET suggested_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, title, suggested_date, suggested_time', 
        ['2025-11-07', contentId]
      );
      
      console.log('✅ Updated content idea:', JSON.stringify(updateResult.rows[0], null, 2));
      console.log('🎉 Blind Wine Tasting has been moved to November 7th, 2025!');
    } else {
      console.log('❌ No Blind Wine Tasting content found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateBlindWineDate();
