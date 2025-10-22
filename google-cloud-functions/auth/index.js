// Google Cloud Function for Authentication
exports.auth = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Simple authentication logic
      // In production, you'd verify credentials against Supabase Auth
      const user = {
        id: 'user-123',
        email: email,
        name: 'Demo User'
      };

      // Return success response
      res.json({
        success: true,
        data: {
          user,
          token: 'demo-token-123'
        }
      });

    } catch (error) {
      console.error('❌ Auth error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    // Token verification
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      
      // Simple token verification
      if (token === 'demo-token-123') {
        res.json({
          success: true,
          user: {
            id: 'user-123',
            email: 'demo@example.com',
            name: 'Demo User'
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }

    } catch (error) {
      console.error('❌ Token verification error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
