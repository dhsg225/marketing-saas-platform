// [October 16, 2025] - Seed Portfolio Images from Unsplash
// Purpose: Fetch images from Unsplash and populate talent portfolios
// Features: Download images, upload to Bunny.net, create portfolio records

const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
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

// Unsplash Access Key (free tier allows 50 requests/hour)
const UNSPLASH_ACCESS_KEY = 'your-unsplash-access-key'; // Get from https://unsplash.com/developers

// Portfolio items for each talent type
const portfolioItems = {
  photographer: [
    { query: 'corporate photography', title: 'Corporate Headshots - Tech Company', description: 'Professional headshots for executive team' },
    { query: 'product photography', title: 'Product Photography - E-commerce', description: 'High-quality product shots for online store' },
    { query: 'event photography', title: 'Corporate Event Coverage', description: 'Annual conference and networking event' },
    { query: 'architecture photography', title: 'Architecture & Interior', description: 'Commercial space photography' },
    { query: 'food photography', title: 'Restaurant Menu Photography', description: 'Culinary photography for upscale restaurant' },
    { query: 'portrait photography', title: 'Team Photos', description: 'Group photos for company website' }
  ],
  videographer: [
    { query: 'video production', title: 'Corporate Video - Company Overview', description: '2-minute company introduction video' },
    { query: 'commercial video', title: 'Product Launch Video', description: 'Promotional video for new product line' },
    { query: 'event video', title: 'Conference Highlight Reel', description: '5-minute event recap video' },
    { query: 'interview video', title: 'Client Testimonial Series', description: 'Professional interview setup and editing' },
    { query: 'drone video', title: 'Aerial Footage - Real Estate', description: 'Drone videography for property showcase' },
    { query: 'training video', title: 'Internal Training Video', description: 'Educational content for staff onboarding' }
  ],
  social_media_manager: [
    { query: 'social media content', title: 'Instagram Campaign', description: '30-day content calendar execution' },
    { query: 'lifestyle photography', title: 'Behind-the-Scenes Content', description: 'Authentic brand storytelling photos' },
    { query: 'flat lay photography', title: 'Product Flat Lays', description: 'Instagram-ready product styling' },
    { query: 'influencer content', title: 'Influencer Collaboration', description: 'User-generated content campaign' },
    { query: 'digital marketing', title: 'Social Media Graphics', description: 'Custom graphics for various platforms' },
    { query: 'brand photography', title: 'Brand Lifestyle Shoot', description: 'Cohesive brand imagery for social media' }
  ]
};

async function downloadImage(url, filename) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

async function uploadToBunny(imageBuffer, filename, talentId) {
  try {
    const bunnyUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/portfolio/${talentId}/${filename}`;
    
    await axios.put(bunnyUrl, imageBuffer, {
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY,
        'Content-Type': 'image/jpeg'
      }
    });

    return `https://${process.env.BUNNY_CDN_HOSTNAME}/portfolio/${talentId}/${filename}`;
  } catch (error) {
    console.error('Error uploading to Bunny:', error.message);
    // Fallback to direct Unsplash URL
    return null;
  }
}

async function fetchUnsplashImage(query) {
  try {
    // Use Picsum Photos (Lorem Picsum) - reliable placeholder service
    // Format: https://picsum.photos/width/height?random=seed
    const picsumUrl = `https://picsum.photos/1600/1200?random=${encodeURIComponent(query)}`;
    return picsumUrl;
  } catch (error) {
    console.error('Error fetching image:', error.message);
    return null;
  }
}

async function seedPortfolioImages() {
  const client = await pool.connect();
  
  try {
    console.log('🎨 Starting portfolio image seeding...');
    
    // Get all mock talent profiles
    const talentsResult = await client.query(`
      SELECT id, display_name, talent_type
      FROM talent_profiles
      WHERE display_name LIKE '%Mock%'
      ORDER BY created_at
    `);

    console.log(`📊 Found ${talentsResult.rows.length} mock talent profiles`);

    for (const talent of talentsResult.rows) {
      console.log(`\n👤 Processing ${talent.display_name} (${talent.talent_type})...`);
      
      const items = portfolioItems[talent.talent_type] || portfolioItems.photographer;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        try {
          // Fetch image from Unsplash
          const imageUrl = await fetchUnsplashImage(item.query);
          
          if (!imageUrl) {
            console.log(`   ⚠️  Skipping ${item.title} - no image found`);
            continue;
          }

          // For now, we'll use the Unsplash URL directly
          // In production, you'd download and upload to Bunny.net
          
          // Check if portfolio item already exists
          const existingItem = await client.query(`
            SELECT id FROM talent_portfolios 
            WHERE talent_id = $1 AND title = $2
          `, [talent.id, item.title]);

          if (existingItem.rows.length > 0) {
            console.log(`   ⏭️  ${item.title} already exists`);
            continue;
          }

          // Insert portfolio item
          await client.query(`
            INSERT INTO talent_portfolios (
              talent_id, media_type, media_url, title, description,
              is_featured, is_public, display_order, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          `, [
            talent.id,
            'image',
            imageUrl,
            item.title,
            item.description,
            i === 0, // First item is featured
            true,
            i + 1
          ]);

          console.log(`   ✅ Added: ${item.title}`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`   ❌ Error adding ${item.title}:`, error.message);
        }
      }
    }

    console.log('\n✅ Portfolio image seeding complete!');
    console.log('📊 Summary:');
    
    // Get counts
    const portfolioCount = await client.query(`
      SELECT 
        tp.display_name,
        COUNT(tpo.id) as portfolio_count
      FROM talent_profiles tp
      LEFT JOIN talent_portfolios tpo ON tp.id = tpo.talent_id
      WHERE tp.display_name LIKE '%Mock%'
      GROUP BY tp.id, tp.display_name
    `);

    portfolioCount.rows.forEach(row => {
      console.log(`   • ${row.display_name}: ${row.portfolio_count} items`);
    });

  } catch (error) {
    console.error('❌ Error seeding portfolio images:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding
seedPortfolioImages()
  .then(() => {
    console.log('🎉 Portfolio seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Portfolio seeding failed:', error);
    process.exit(1);
  });
