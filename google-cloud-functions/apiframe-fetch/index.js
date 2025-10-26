// [Oct 24, 2025 - 10:10] Quick helper to manually fetch completed Apiframe tasks
// This bypasses the broken polling and just grabs the result
const fetch = require('node-fetch');

exports['apiframe-fetch'] = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const apiframeKey = process.env.APIFRAME_API_KEY;
    const { taskId } = req.query;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId required' });
    }

    // Try different Apiframe endpoints
    const endpoints = [
      `https://api.apiframe.pro/status/${taskId}`,
      `https://api.apiframe.pro/task/${taskId}`,
      `https://api.apiframe.pro/v1/status/${taskId}`,
      `https://api.apiframe.pro/v1/task/${taskId}`,
      `https://api.apiframe.pro/imagine/${taskId}`
    ];

    console.log(`🔍 Trying ${endpoints.length} possible Apiframe endpoints for task ${taskId}...`);

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${apiframeKey}` }
        });

        const text = await response.text();
        
        // Skip HTML error responses
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          console.log(`❌ ${endpoint}: HTML error`);
          continue;
        }

        const data = JSON.parse(text);
        console.log(`✅ Found data at ${endpoint}`);
        
        return res.json({
          success: true,
          endpoint,
          data
        });
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Could not find task in any Apiframe endpoint',
      triedEndpoints: endpoints
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
};

