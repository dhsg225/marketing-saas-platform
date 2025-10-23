// Google Cloud Function for Authentication - REAL SUPABASE DATA
const { createClient } = require('@supabase/supabase-js');

exports.auth = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if this is a sub-path request (like /auth/organizations)
  const pathSegments = req.url?.split('/').filter(Boolean) || [];
  
  if (pathSegments.includes('organizations')) {
    // Handle organizations endpoint - return real organization data
    try {
      // Get organizations for the authenticated user only
      // Extract user ID from token (format: token_${user.id}_${timestamp})
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const tokenParts = token.split('_');
      if (tokenParts.length !== 3 || tokenParts[0] !== 'token') {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      const userId = tokenParts[1];
      
      // Get organizations for this specific user only
      const { data: organizations, error } = await supabase
        .from('user_organizations')
        .select('organization_id, role, created_at')
        .eq('user_id', userId)
        .limit(10); // Limit to prevent large responses

      if (error) {
        console.error('❌ Supabase organizations error:', error);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        data: organizations || []
      });
    } catch (error) {
      console.error('❌ Organizations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Real authentication logic - verify credentials against custom users table
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

      if (userError || !users || users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      
      // Simple password verification (in production, use proper bcrypt comparison)
      // For now, we'll accept any password for existing users
      const bcrypt = require('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate a simple token (in production, use proper JWT)
      const token = `token_${user.id}_${Date.now()}`;

      // Return success response with real user data
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            industry_preference: user.industry_preference,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          token: token
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
      
      // Real token verification using custom token system
      // Extract user ID from token (format: token_${user.id}_${timestamp})
      const tokenParts = token.split('_');
      if (tokenParts.length !== 3 || tokenParts[0] !== 'token') {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      const userId = tokenParts[1];
      
      // Get user from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error('❌ Profile fetch error:', profileError);
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({
        success: true,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          industry_preference: userProfile.industry_preference,
          created_at: userProfile.created_at,
          updated_at: userProfile.updated_at
        }
      });

    } catch (error) {
      console.error('❌ Token verification error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
