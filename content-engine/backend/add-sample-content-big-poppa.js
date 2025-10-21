const axios = require('axios');

async function addSampleContentForBigPoppa() {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZTE1OTZlYi05NWZhLTRhZDktOTdlNy0yZWIwZGExMWU4YzkiLCJlbWFpbCI6InNoYW5ub24uZ3JlZW4uYXNpYUBnbWFpbC5jb20iLCJpYXQiOjE3NjA3ODY1MDksImV4cCI6MTc2MTM5MTMwOX0.uTEKejnc0QmRWCjba_aoWnqlUeuNe9T3TqCbbd4GltA';
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Sample content items for Big Poppa project
    const sampleItems = [
      {
        project_id: 'b5f0094a-57c4-4559-bd2e-1fc4419626e1', // Big Poppa project
        title: 'Instagram Post: Signature Burger Reveal',
        description: 'Introduce our signature Big Poppa burger with mouth-watering visuals',
        content_type: 'post',
        stage: 'ideas',
        priority: 'high'
      },
      {
        project_id: 'b5f0094a-57c4-4559-bd2e-1fc4419626e1',
        title: 'TikTok Video: Burger Assembly Process',
        description: 'Quick 30-second video showing how we build the perfect burger',
        content_type: 'video',
        stage: 'in_progress',
        priority: 'urgent'
      },
      {
        project_id: 'b5f0094a-57c4-4559-bd2e-1fc4419626e1',
        title: 'Facebook Ad: Grand Opening Special',
        description: 'Promote our grand opening with special offers and location details',
        content_type: 'ad',
        stage: 'assets_attached',
        priority: 'high'
      },
      {
        project_id: 'b5f0094a-57c4-4559-bd2e-1fc4419626e1',
        title: 'Instagram Story: Behind the Scenes',
        description: 'Show the kitchen team preparing fresh ingredients',
        content_type: 'story',
        stage: 'ready_to_publish',
        priority: 'medium'
      },
      {
        project_id: 'b5f0094a-57c4-4559-bd2e-1fc4419626e1',
        title: 'LinkedIn Article: Restaurant Industry Insights',
        description: 'Share insights about the burger restaurant market and trends',
        content_type: 'blog',
        stage: 'published',
        priority: 'low'
      },
      {
        project_id: 'b5f0094a-57c4-4559-bd2e-1fc4419626e1',
        title: 'Instagram Reel: Customer Reactions',
        description: 'Compilation of customers trying our burgers for the first time',
        content_type: 'reel',
        stage: 'published',
        priority: 'medium'
      }
    ];
    
    console.log('🔍 Adding sample content items for Big Poppa project...');
    
    for (const item of sampleItems) {
      try {
        const response = await axios.post(
          'http://localhost:5001/api/content-list',
          item,
          { headers }
        );
        
        if (response.data.success) {
          console.log(`✅ Created: ${item.title} (${item.stage})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create ${item.title}:`, error.response?.data || error.message);
      }
    }
    
    console.log('🎉 Sample content items added for Big Poppa!');
    
  } catch (error) {
    console.error('❌ Error adding sample content:', error.message);
  }
}

addSampleContentForBigPoppa();
