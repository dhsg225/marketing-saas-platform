// Simple auth endpoint without Next.js dependencies
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Simple test response without JWT dependencies
    res.json({
      success: true,
      message: 'Auth endpoint working',
      data: {
        user: {
          id: 'test-user',
          email: email,
          name: 'Test User'
        },
        token: 'test-token-123'
      }
    });

  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}