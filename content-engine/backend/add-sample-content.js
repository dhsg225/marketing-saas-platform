const axios = require('axios');

async function addSampleContent() {
  try {
    // First, let's get a project ID and user ID
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZTE1OTZlYi05NWZhLTRhZDktOTdlNy0yZWIwZGExMWU4YzkiLCJlbWFpbCI6InNoYW5ub24uZ3JlZW4uYXNpYUBnbWFpbC5jb20iLCJpYXQiOjE3NjA3ODY1MDksImV4cCI6MTc2MTM5MTMwOX0.uTEKejnc0QmRWCjba_aoWnqlUeuNe9T3TqCbbd4GltA';
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Sample content items
    const sampleItems = [
      {
        project_id: '71e79ebf-d640-48d1-978f-b552a8b85bcd', // Matt's Place project
        title: 'Instagram Story: Behind the Scenes Kitchen',
        description: 'Show the preparation process of our signature dishes',
        content_type: 'story',
        stage: 'ideas',
        priority: 'high'
      },
      {
        project_id: '71e79ebf-d640-48d1-978f-b552a8b85bcd',
        title: 'Facebook Post: New Menu Launch',
        description: 'Announce the new seasonal menu with mouth-watering photos',
        content_type: 'post',
        stage: 'in_progress',
        priority: 'urgent'
      },
      {
        project_id: '71e79ebf-d640-48d1-978f-b552a8b85bcd',
        title: 'TikTok Video: Quick Recipe Tutorial',
        description: '30-second tutorial on making the perfect croquetas',
        content_type: 'video',
        stage: 'assets_attached',
        priority: 'medium'
      },
      {
        project_id: '71e79ebf-d640-48d1-978f-b552a8b85bcd',
        title: 'LinkedIn Article: Restaurant Industry Trends',
        description: 'Thought leadership piece on post-pandemic dining trends',
        content_type: 'blog',
        stage: 'ready_to_publish',
        priority: 'low'
      },
      {
        project_id: '71e79ebf-d640-48d1-978f-b552a8b85bcd',
        title: 'Instagram Reel: Customer Testimonials',
        description: 'Compilation of happy customers sharing their experience',
        content_type: 'reel',
        stage: 'published',
        priority: 'medium'
      }
    ];
    
    console.log('🔍 Adding sample content items...');
    
    for (const item of sampleItems) {
      try {
        const response = await axios.post(
          'http://localhost:5001/api/content-list',
          item,
          { headers }
        );
        
        if (response.data.success) {
          console.log(`✅ Created: ${item.title}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create ${item.title}:`, error.response?.data || error.message);
      }
    }
    
    console.log('🎉 Sample content items added!');
    
  } catch (error) {
    console.error('❌ Error adding sample content:', error.message);
  }
}

addSampleContent();
