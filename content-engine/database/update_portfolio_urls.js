// [October 16, 2025] - Update Portfolio URLs
// Purpose: Replace broken Unsplash URLs with working Picsum Photos URLs

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Database configuration
const pool = new Pool({
  user: process.env.SUPABASE_DB_USER || 'postgres',
  host: process.env.SUPABASE_DB_HOST || 'localhost',
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'password',
  port: process.env.SUPABASE_DB_PORT || 5432,
  ssl: process.env.SUPABASE_DB_HOST ? { rejectUnauthorized: false } : false
});

async function updatePortfolioUrls() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating portfolio URLs...');
    
    // Get all portfolio items with broken Unsplash URLs
    const portfolioResult = await client.query(`
      SELECT id, talent_id, title, media_url
      FROM talent_portfolios
      WHERE media_url LIKE '%source.unsplash.com%'
      ORDER BY talent_id, display_order
    `);

    console.log(`📊 Found ${portfolioResult.rows.length} portfolio items to update`);

    for (const item of portfolioResult.rows) {
      // Generate new Picsum Photos URL with unique seed
      const newUrl = `https://picsum.photos/1600/1200?random=${item.talent_id}${item.id}`;
      const thumbnailUrl = `https://picsum.photos/400/300?random=${item.talent_id}${item.id}`;

      await client.query(`
        UPDATE talent_portfolios
        SET 
          media_url = $1,
          thumbnail_url = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [newUrl, thumbnailUrl, item.id]);

      console.log(`   ✅ Updated: ${item.title}`);
    }

    console.log('\n✅ Portfolio URL update complete!');
    
    // Verify the update
    const updatedCount = await client.query(`
      SELECT COUNT(*) as count
      FROM talent_portfolios
      WHERE media_url LIKE '%picsum.photos%'
    `);
    
    console.log(`📊 Updated ${updatedCount.rows[0].count} portfolio items with working URLs`);

  } catch (error) {
    console.error('❌ Error updating portfolio URLs:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updatePortfolioUrls()
  .then(() => {
    console.log('🎉 Portfolio URL update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Portfolio URL update failed:', error);
    process.exit(1);
  });
