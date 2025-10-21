const axios = require('axios');

async function updateBlindWineViaAPI() {
  try {
    console.log('🔍 Looking for Blind Wine Tasting content via API...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZTE1OTZlYi05NWZhLTRhZDktOTdlNy0yZWIwZGExMWU4YzkiLCJlbWFpbCI6InNoYW5ub24uZ3JlZW4uYXNpYUBnbWFpbC5jb20iLCJpYXQiOjE3NjA5Nzg1MDIsImV4cCI6MTc2MTU4MzMwMn0.FZi45ezXrfdDWYpShlWI9B-_DwHcw0zRt3JRzmCtscQ';
    
    // Get the content ideas with auth
    const response = await axios.get('http://localhost:5001/api/content-ideas/project/71e79ebf-d640-48d1-978f-b552a8b85bcd?limit=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response:', response.data);
    
    if (response.data.success && response.data.data) {
      const blindWineContent = response.data.data.find(item => 
        item.title && item.title.toLowerCase().includes('blind wine')
      );
      
      if (blindWineContent) {
        console.log('Found Blind Wine Tasting content:', blindWineContent);
        console.log('ID:', blindWineContent.id);
        console.log('Current date:', blindWineContent.suggested_date);
        
        // Now update it to November 7th, 2025
        const updateResponse = await axios.put(
          `http://localhost:5001/api/content-ideas/${blindWineContent.id}`,
          {
            suggested_date: '2025-11-07T12:00:00.000Z'
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Update response:', updateResponse.data);
        console.log('🎉 Blind Wine Tasting has been moved to November 7th, 2025!');
      } else {
        console.log('❌ No Blind Wine Tasting content found in API response');
      }
    } else {
      console.log('❌ API request failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

updateBlindWineViaAPI();
