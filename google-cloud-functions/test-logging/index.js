exports.testLogging = async (req, res) => {
  console.log('🔍 TEST: Function called!');
  console.log('🔍 TEST: Request method:', req.method);
  console.log('🔍 TEST: Request URL:', req.url);
  
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.json({
    success: true,
    message: 'Test logging function called',
    timestamp: new Date().toISOString()
  });
};
